import stackApiService from './stack/stackApiService';
import BlockchainService from './blockchain/blockchainService';
import logger from '../utils/logger';
import config from '../config';
import { AddressEligibility, PointSystemEligibility, StackAllocation } from '../models/types';
import { latestRecipients } from '../utils/UBARecipients';
import pMemoize from 'p-memoize';
import { halfDayCache } from '../config/cache';

const { POINT_THRESHOLD, POINTS_TO_ASSIGN, COMMUNITY_ACTIVATION_ID, THRESHOLD_TIME_PERIOD, THRESHOLD_MAX_USERS } = config;

class EligibilityService {
  /**
   * Check eligibility for multiple addresses across all point systems
   * @param addresses Array of Ethereum addresses
   * @returns Promise with eligibility data for each address
   */
  async checkEligibility(addresses: string[], apiConsumerName: string): Promise<AddressEligibility[]> {
    try {
      return await this.checkEligibilityMemoized(addresses, apiConsumerName);
    } catch (error) {
      logger.error('Failed to check eligibility', { error });
      throw new Error(`Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private implementation of eligibility check
   * @param addresses Array of Ethereum addresses
   * @returns Promise with eligibility data for each address
   */
  private async _checkEligibility(addresses: string[], apiConsumerName: string): Promise<AddressEligibility[]> {
    // Log the start of the eligibility check
    logger.info(`Checking eligibility for ${addresses.length} addresses`);

    // Fetch allocations from Stack API
    const allAllocations = await stackApiService.fetchAllAllocations(addresses);

    logger.info("allAllocations in _checkEligibility: ", allAllocations);
    // Auto-assign points to addresses with < POINT_THRESHOLD points
    const newCommunityAllocations = await this.autoAssignPoints(addresses, allAllocations, apiConsumerName);
    allAllocations.set(COMMUNITY_ACTIVATION_ID, newCommunityAllocations);
    // Get locker addresses
    let lockerAddresses: Map<string, string> = new Map();
    try {
      lockerAddresses = await BlockchainService.getLockerAddressesMemoized(addresses);
    } catch (error) {
      logger.error('Failed to get locker addresses', { error });
      logger.slackNotify(`Failed to get locker addresses for addresses: ${addresses.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    logger.info("lockerAddresses in _checkEligibility: ", lockerAddresses);
    // Check claim status on blockchain
    let allClaimStatuses: Map<string, Map<number, bigint>> = new Map();
    try {
      allClaimStatuses = await BlockchainService.checkAllClaimStatuses(lockerAddresses);
    } catch (error) {
      logger.error('Failed to get claim statuses', { error });
      logger.slackNotify(`Failed to get claim statuses for addresses: ${addresses.join(', ')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Fetch total units for each point system
    for (const pointSystem of config.pointSystems) {
      const totalUnits = await BlockchainService.getTotalUnitsMemoized(pointSystem.gdaPoolAddress);
      pointSystem.totalUnits = Number(totalUnits);
    }

    // Combine the data for each address
    const results = addresses.map(address => {
      const eligibility: PointSystemEligibility[] = [];
      let claimNeeded = false;
      let hasAllocations = false;
      // Calculate flow rate for each address
      let totalFlowRateBigInt = BigInt(0);

      // Process each point system
      config.pointSystems.forEach((pointSystem) => {
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

      logger.slackNotify(`Refreshed data for ${address} from stack.so`, 'info');

      return {
        address,
        hasAllocations,
        claimNeeded,
        // Store as string to preserve precision
        totalFlowRate: totalFlowRateBigInt.toString(),
        eligibility
      };
    });

    logger.info(`Eligibility check completed for ${addresses.length} addresses`);
    return results;
  }

  /**
   * Memoized version of eligibility check to reduce API calls
   */
  private checkEligibilityMemoized = async (addresses: string[], apiConsumerName: string): Promise<AddressEligibility[]> => {
    // Create a cache key for each individual address and check
    const results = await Promise.all(
      addresses.map(address =>
        pMemoize(this._checkEligibility.bind(this), {
          cache: halfDayCache,
          cacheKey: () => `check-eligibility-${address.toLowerCase()}`
        })([address, apiConsumerName])
      )
    );
    return results.flat();
  }

  /**
   * Auto-assign points to addresses with less than threshold points
   * @param addresses Array of Ethereum addresses to check and assign points to
   * @param allAllocations Current allocations map from Stack API
   */
  private async autoAssignPoints(addresses: string[], allAllocations: Map<number, StackAllocation[]>, apiConsumerName: string): Promise<StackAllocation[]> {
    // Get existing allocations for the community activation point system
    const communityAllocations: StackAllocation[] = [...(allAllocations.get(COMMUNITY_ACTIVATION_ID) || [])];

    // Process each address in parallel
    const updatedAllocationsPromises = addresses.map(async (address): Promise<StackAllocation> => {
      // Find existing allocation for this address in Community Activation
      const existingAllocation = communityAllocations.find(
        a => a.accountAddress.toLowerCase() === address.toLowerCase()
      ) || {
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
        const userNonce = await BlockchainService.getUserNonce(address as `0x${string}`);

        // If points are below threshold, assign more points
        if (currentPoints < POINT_THRESHOLD && userNonce > NONCE_THRESHOLD) {
          // Check that we're under the threshold of users per hour
          const recipientsToppedUp = latestRecipients(THRESHOLD_TIME_PERIOD).length;

          if (recipientsToppedUp < THRESHOLD_MAX_USERS) {
            logger.info(`Address ${address} has ${currentPoints} points, auto-assigning ${POINTS_TO_ASSIGN} points. User from ${apiConsumerName}`);

            // Fire and forget - don't wait for completion
            stackApiService.assignPoints(address, POINTS_TO_ASSIGN);

            // Update allocation in our local map for immediate response
            finalPoints += POINTS_TO_ASSIGN;
          } else {
            logger.info(`Address ${address} has ${currentPoints} points, not auto-assigning ${POINTS_TO_ASSIGN} points because we're over the threshold of ${THRESHOLD_MAX_USERS} users per hour`);
            logger.slackNotify(`Address ${address} has ${currentPoints} points, not auto-assigning ${POINTS_TO_ASSIGN} points because we're over the threshold of ${THRESHOLD_MAX_USERS} users per hour`);
          }
        }
      } catch (error) {
        logger.error(`Failed to get nonce for address ${address}`, { error });
        logger.slackNotify(`Failed to get nonce for address ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      return { ...existingAllocation, points: finalPoints };
    });

    // Wait for all address processing to complete
    const updatedCommunityAllocations = await Promise.all(updatedAllocationsPromises);
    return updatedCommunityAllocations;
  }
}

export default new EligibilityService(); 