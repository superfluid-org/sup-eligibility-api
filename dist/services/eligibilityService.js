"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stackApiService_1 = __importDefault(require("./stack/stackApiService"));
const blockchainService_1 = __importDefault(require("./blockchain/blockchainService"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const UBARecipients_1 = require("../utils/UBARecipients");
const p_memoize_1 = __importDefault(require("p-memoize"));
const cache_1 = require("../config/cache");
const { POINT_THRESHOLD, POINTS_TO_ASSIGN, COMMUNITY_ACTIVATION_ID, THRESHOLD_TIME_PERIOD, THRESHOLD_MAX_USERS } = config_1.default;
class EligibilityService {
    constructor() {
        /**
         * Memoized version of eligibility check to reduce API calls
         */
        this.checkEligibilityMemoized = async (addresses) => {
            // Create a cache key for each individual address and check
            const results = await Promise.all(addresses.map(address => (0, p_memoize_1.default)(this._checkEligibility.bind(this), {
                cache: cache_1.halfDayCache,
                cacheKey: () => `check-eligibility-${address.toLowerCase()}`
            })([address])));
            return results.flat();
        };
    }
    /**
     * Check eligibility for multiple addresses across all point systems
     * @param addresses Array of Ethereum addresses
     * @returns Promise with eligibility data for each address
     */
    async checkEligibility(addresses) {
        try {
            // Use memoization for production, direct call for development
            if (config_1.default.nodeEnv === 'production') {
                return await this.checkEligibilityMemoized(addresses);
            }
            else {
                return await this._checkEligibility(addresses);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to check eligibility', { error });
            throw new Error(`Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Private implementation of eligibility check
     * @param addresses Array of Ethereum addresses
     * @returns Promise with eligibility data for each address
     */
    async _checkEligibility(addresses) {
        // Log the start of the eligibility check
        logger_1.default.info(`Checking eligibility for ${addresses.length} addresses`);
        // Fetch allocations from Stack API
        const allAllocations = await stackApiService_1.default.fetchAllAllocations(addresses);
        // Auto-assign points to addresses with < POINT_THRESHOLD points
        const newCommunityAllocations = await this.autoAssignPoints(addresses, allAllocations);
        allAllocations.set(COMMUNITY_ACTIVATION_ID, newCommunityAllocations);
        // Get locker addresses
        let lockerAddresses = new Map();
        try {
            lockerAddresses = await blockchainService_1.default.getLockerAddresses(addresses);
        }
        catch (error) {
            logger_1.default.error('Failed to get locker addresses', { error });
            logger_1.default.slackNotify(`Failed to get locker addresses for addresses: ${addresses.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Check claim status on blockchain
        let allClaimStatuses = new Map();
        try {
            allClaimStatuses = await blockchainService_1.default.checkAllClaimStatuses(lockerAddresses);
        }
        catch (error) {
            logger_1.default.error('Failed to get claim statuses', { error });
            logger_1.default.slackNotify(`Failed to get claim statuses for addresses: ${addresses.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Fetch total units for each point system
        for (const pointSystem of config_1.default.pointSystems) {
            const totalUnits = await blockchainService_1.default.getTotalUnits(pointSystem.gdaPoolAddress);
            pointSystem.totalUnits = Number(totalUnits);
        }
        // Combine the data for each address
        const results = addresses.map(address => {
            const eligibility = [];
            let claimNeeded = false;
            let hasAllocations = false;
            // Calculate flow rate for each address
            let totalFlowRateBigInt = BigInt(0);
            // Process each point system
            config_1.default.pointSystems.forEach((pointSystem) => {
                const { id, name, gdaPoolAddress, flowrate, totalUnits } = pointSystem;
                // Find allocation for this address
                const allocations = allAllocations.get(id) || [];
                const { points } = allocations.find(a => a?.accountAddress?.toLowerCase() === address.toLowerCase()) || { points: 0 };
                let estimatedFlowRateBigInt = BigInt(0);
                const claimStatus = allClaimStatuses.get(address)?.get(id);
                const amountToClaimBigInt = BigInt(points) - (claimStatus || BigInt(0));
                const needToClaim = amountToClaimBigInt > BigInt(0);
                const amountToClaim = Number(amountToClaimBigInt);
                // Calculate flow rate if there are units in the pool
                if (totalUnits > 0) {
                    const totalUnitsBigInt = BigInt(totalUnits + amountToClaim);
                    const pointsBigInt = BigInt(points);
                    // Calculation: (points / totalUnits) * flowrate
                    const scaleFactor = BigInt(1000000000); // 10^9 for precision
                    estimatedFlowRateBigInt = (pointsBigInt * scaleFactor / totalUnitsBigInt) * flowrate / scaleFactor;
                    // Add to total
                    totalFlowRateBigInt += estimatedFlowRateBigInt;
                }
                const obj = {
                    pointSystemId: id,
                    pointSystemName: name,
                    eligible: points > 0,
                    points,
                    claimedAmount: Number(claimStatus) || 0,
                    needToClaim,
                    gdaPoolAddress,
                    // Store as string to preserve precision
                    estimatedFlowRate: estimatedFlowRateBigInt.toString()
                };
                // Add eligibility data
                eligibility.push(obj);
                if (needToClaim) {
                    claimNeeded = true;
                }
                if (points > 0) {
                    hasAllocations = true;
                }
            });
            logger_1.default.slackNotify(`Refreshed data for ${address} from stack.so`, 'info');
            return {
                address,
                hasAllocations,
                claimNeeded,
                // Store as string to preserve precision
                totalFlowRate: totalFlowRateBigInt.toString(),
                eligibility
            };
        });
        logger_1.default.info(`Eligibility check completed for ${addresses.length} addresses`);
        return results;
    }
    /**
     * Auto-assign points to addresses with less than threshold points
     * @param addresses Array of Ethereum addresses to check and assign points to
     * @param allAllocations Current allocations map from Stack API
     */
    async autoAssignPoints(addresses, allAllocations) {
        // Get existing allocations for the community activation point system
        const communityAllocations = [...(allAllocations.get(COMMUNITY_ACTIVATION_ID) || [])];
        // Process each address in parallel
        const updatedAllocationsPromises = addresses.map(async (address) => {
            // Find existing allocation for this address in Community Activation
            const existingAllocation = communityAllocations.find(a => a.accountAddress.toLowerCase() === address.toLowerCase()) || {
                pointSystemUuid: "28abd1a3-bba1-43af-9033-5059580c1b61",
                accountAddress: address,
                points: 0,
                allocation: BigInt(0),
                maxCreatedAt: new Date().toISOString()
            };
            // Get current point balance, defaulting to 0 if not found
            const currentPoints = existingAllocation?.points || 0;
            let finalPoints = currentPoints;
            const NONCE_THRESHOLD = 5;
            try {
                // Get user's transaction count from blockchain
                const userNonce = await blockchainService_1.default.getUserNonce(address);
                // If points are below threshold, assign more points
                if (currentPoints < POINT_THRESHOLD && userNonce > NONCE_THRESHOLD) {
                    // Check that we're under the threshold of users per hour
                    const recipientsToppedUp = (0, UBARecipients_1.latestRecipients)(THRESHOLD_TIME_PERIOD).length;
                    if (recipientsToppedUp < THRESHOLD_MAX_USERS) {
                        logger_1.default.info(`Address ${address} has ${currentPoints} points, auto-assigning ${POINTS_TO_ASSIGN} points`);
                        // Fire and forget - don't wait for completion
                        stackApiService_1.default.assignPoints(address, POINTS_TO_ASSIGN);
                        // Update allocation in our local map for immediate response
                        finalPoints += POINTS_TO_ASSIGN;
                    }
                    else {
                        logger_1.default.info(`Address ${address} has ${currentPoints} points, not auto-assigning ${POINTS_TO_ASSIGN} points because we're over the threshold of ${THRESHOLD_MAX_USERS} users per hour`);
                        logger_1.default.slackNotify(`Address ${address} has ${currentPoints} points, not auto-assigning ${POINTS_TO_ASSIGN} points because we're over the threshold of ${THRESHOLD_MAX_USERS} users per hour`);
                    }
                }
            }
            catch (error) {
                logger_1.default.error(`Failed to get nonce for address ${address}`, { error });
                logger_1.default.slackNotify(`Failed to get nonce for address ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return { ...existingAllocation, points: finalPoints };
        });
        // Wait for all address processing to complete
        const updatedCommunityAllocations = await Promise.all(updatedAllocationsPromises);
        return updatedCommunityAllocations;
    }
}
exports.default = new EligibilityService();
//# sourceMappingURL=eligibilityService.js.map