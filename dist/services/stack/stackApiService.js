"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../../config"));
const config_2 = require("../../config");
const logger_1 = __importDefault(require("../../utils/logger"));
const UBARecipients_1 = require("../../utils/UBARecipients");
const cache_1 = require("../../config/cache");
const formatUtils_1 = require("./formatUtils");
const p_memoize_1 = __importDefault(require("p-memoize"));
const { COMMUNITY_ACTIVATION_ID, THRESHOLD_TIME_PERIOD, STACK_EVENT_ADD_POINTS_URL } = config_1.default;
class StackApiService {
    constructor() {
        this.baseUrl = config_1.default.stackApiBaseUrl;
        if (!process.env.STACK_API_KEY) {
            throw new Error('STACK_API_KEY is not set');
        }
        this.apiKey = process.env.STACK_API_KEY || '';
        if (!process.env.STACK_WRITE_API_KEY) {
            throw new Error('STACK_WRITE_API_KEY is not set');
        }
        this.writeApiKey = process.env.STACK_WRITE_API_KEY;
    }
    /**
     * Fetch allocations for a specific point system and addresses
     * @param pointSystemId The ID of the point system
     * @param addresses Array of Ethereum addresses
     * @returns Promise with allocation data
     */
    async fetchAllocations(pointSystemId, addresses) {
        try {
            const url = `${this.baseUrl}/point-system/${pointSystemId}/allocations`;
            logger_1.default.info(`Fetching allocations from ${url} for ${addresses.length} addresses`);
            const response = await axios_1.default.post(url, { addresses }, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.res.allocations || [];
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch allocations for point system ${pointSystemId}`, { error });
            throw new Error(`Failed to fetch allocations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Fetch allocations for multiple point systems and addresses
     * @param addresses Array of Ethereum addresses
     * @returns Promise with allocation data grouped by point system
     */
    async fetchAllAllocations(addresses) {
        const allAllocations = new Map();
        // Use Promise.all to fetch from all point systems in parallel
        await Promise.all(config_1.default.pointSystems.map(async (pointSystem) => {
            try {
                const allocations = await this.fetchAllocations(pointSystem.id, addresses);
                allAllocations.set(pointSystem.id, allocations);
            }
            catch (error) {
                logger_1.default.error(`Error fetching allocations for point system ${pointSystem.id}`, { error });
                // Send a Slack notification when a specific program eligibility check fails
                logger_1.default.slackNotify(`Failed to check eligibility for program (ID: ${pointSystem.id}) for addresses: ${addresses.join(', ')}. Error: ${error}`);
                // Set empty array for failed point system to maintain consistency
                allAllocations.set(pointSystem.id, []);
            }
        }));
        return allAllocations;
    }
    /**
     * Assign points to an address in a specific point system
     * @param address Ethereum address to assign points to
     * @param points Number of points to assign
     * @param eventName Event name for the point assignment
     * @returns Promise with assignment result
     */
    async assignPoints(address, points, eventName = "universal_allocation") {
        try {
            const url = STACK_EVENT_ADD_POINTS_URL;
            const uniqueId = `${eventName.toLowerCase().replace(/_/g, '-')}-${address.toLowerCase()}`;
            logger_1.default.info(`Assigning ${points} points to ${address} in point system ${COMMUNITY_ACTIVATION_ID}`);
            const data = [{
                    "name": eventName,
                    "account": address.toLowerCase(),
                    "pointSystemId": COMMUNITY_ACTIVATION_ID,
                    "uniqueId": uniqueId,
                    "points": points
                }];
            const response = await axios_1.default.post(url, data, {
                headers: {
                    'x-api-key': this.writeApiKey,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status >= 200 && response.status < 300) {
                if (eventName === "universal_allocation") {
                    // add recipient to UBARecipients list
                    (0, UBARecipients_1.addRecipient)({ address });
                    const recipients = (0, UBARecipients_1.getStoredRecipients)();
                    const lastHour = (0, UBARecipients_1.latestRecipients)(THRESHOLD_TIME_PERIOD).length;
                    logger_1.default.slackNotify(`Successfully assigned ${points} points to ${address} and added ${address} to recipients list. ${recipients.length} recipients in list. ${lastHour} in the last hour `);
                }
                else if (eventName.includes("completed_level")) {
                    logger_1.default.slackNotify(`Successfully assigned ${points} points to ${address} for "${eventName.replace(/_/g, ' ')}"`);
                }
                else if (eventName === "referral_reward") {
                    logger_1.default.slackNotify(`Successfully assigned ${points} points to ${address} for "${eventName.replace(/_/g, ' ')}"`);
                }
                return true;
            }
            else {
                logger_1.default.error(`Failed to assign points, received status ${response.status}`);
                logger_1.default.slackNotify(`Failed to assign points, received status ${response.status}`, 'error');
                return false;
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to assign ${points} points to ${address}`, { error });
            logger_1.default.slackNotify(`Failed to assign ${points} points to ${address}`, 'error');
            return false;
        }
    }
    /**
     * Get stack activity for all point systems for a specific address
     * @param address Ethereum address
     * @returns Promise with stack activity data
     */
    async getStackActivityForAllPointSystems(address) {
        return await getStackActivityForAllPointSystemsMemoized(address);
    }
    /**
     * Get stack activity for a specific address and point system
     * @param address Ethereum address
     * @param pointSystemId The ID of the point system
     * @returns Promise with stack activity data
     */
    async getStackActivity(address, pointSystemId) {
        return await getStackActivityMemoized(address, pointSystemId);
    }
}
/**
 * Private implementation of getStackActivityForAllPointSystems
 * This is separated to allow for memoization
 */
const _getStackActivityForAllPointSystems = async (address) => {
    return await Promise.all(config_1.default.pointSystems.map((pointSystem) => getStackActivityMemoized(address, pointSystem.id)));
};
/**
 * Private implementation of getStackActivity
 * This is separated to allow for memoization
 */
const _getStackActivity = async (address, pointSystemId) => {
    try {
        let allResults = [];
        let hasMore = true;
        let offset = 0;
        const limit = 100;
        while (hasMore) {
            const query = {
                limit,
                offset,
                where: {
                    associatedAccount: address
                },
                orderBy: [
                    { eventTimestamp: "desc" },
                    { associatedAccount: "asc" }
                ]
            };
            const url = new URL(`${config_1.default.stackApiBaseUrl}/point-system/${pointSystemId}/events`);
            url.search = new URLSearchParams({
                query: JSON.stringify(query)
            }).toString();
            const key = (0, config_2.getStackApiKey)(pointSystemId) || '';
            console.log("api key being used for point system: ", pointSystemId, " : ", key);
            const response = await axios_1.default.get(url.toString(), {
                headers: {
                    'x-api-key': key
                }
            });
            console.log(url.toString());
            const results = response.data;
            console.log("results: ", results);
            console.log("results.length: ", results.length);
            allResults = [...allResults, ...results];
            // Check if we got less results than limit, meaning no more pages
            if (results.length < limit) {
                hasMore = false;
            }
            else {
                offset += limit;
            }
        }
        return (0, formatUtils_1.formatEvents)(allResults, pointSystemId);
    }
    catch (error) {
        logger_1.default.error(`Error getting stack activity for ${address} in point system ${pointSystemId}`, { error });
        console.log(error);
        return {
            identity: {
                address: '',
                ensName: null,
                farcasterUsername: null,
                lensHandle: null,
                farcasterPfpUrl: null
            },
            events: [],
            aggregates: []
        };
    }
};
/**
 * Memoized version of getStackActivityForAllPointSystems
 * Caches results for 12 hours to reduce API calls
 */
const getStackActivityForAllPointSystemsMemoized = (0, p_memoize_1.default)(_getStackActivityForAllPointSystems, {
    cache: cache_1.halfDayCache,
    cacheKey: ([address]) => `stack-activity-all-${address.toLowerCase()}`
});
/**
 * Memoized version of getStackActivity
 * Caches results for 12 hours to reduce API calls
 */
const getStackActivityMemoized = (0, p_memoize_1.default)(_getStackActivity, {
    cache: cache_1.halfDayCache,
    cacheKey: ([address, pointSystemId]) => `stack-activity-${pointSystemId}-${address.toLowerCase()}`
});
exports.default = new StackApiService();
//# sourceMappingURL=stackApiService.js.map