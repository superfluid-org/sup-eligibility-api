"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const config_1 = __importDefault(require("../../config"));
const logger_1 = __importDefault(require("../../utils/logger"));
const axios_1 = __importDefault(require("axios"));
const gdaPoolAbi = [
    {
        inputs: [{ name: "memberAddr", type: "address" }],
        name: "getUnits",
        outputs: [{ name: "", type: "uint128" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getTotalUnits",
        outputs: [{ name: "", type: "uint128" }],
        stateMutability: "view",
        type: "function"
    }
];
const getUserLockerAbi = [
    {
        inputs: [{ name: "memberAddr", type: "address" }],
        name: "getUserLocker",
        outputs: [{ name: "", type: "bool" }, { name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    }
];
/**
 * Blockchain Service for interacting with Ethereum contracts
 * This service handles all blockchain interactions for the Eligibility API
 */
class BlockchainService {
    constructor() {
        this.client = (0, viem_1.createPublicClient)({
            chain: chains_1.base,
            transport: (0, viem_1.http)(config_1.default.ethereumRpcUrl)
        });
    }
    /**
     * Get user's transaction count (nonce)
     * @param address Ethereum address
     * @returns Promise with transaction count
     */
    async getUserNonce(address) {
        const transactionCount = await this.client.getTransactionCount({
            address,
        });
        return Number(transactionCount);
    }
    /**
     * Check the number of total units in a GDA pool
     * @param gdaPoolAddress Address of the GDA pool contract
     * @returns Promise with total units
     */
    async getTotalUnits(gdaPoolAddress) {
        const totalUnits = await this.client.readContract({
            address: gdaPoolAddress,
            abi: gdaPoolAbi,
            functionName: 'getTotalUnits',
        });
        return totalUnits;
    }
    /**
     * Check if an address has claimed tokens for a specific GDA pool
     * @param lockerAddress Address of the locker contract
     * @param gdaPoolAddress Address of the GDA pool contract
     * @returns Promise with claim status (units)
     */
    async checkClaimStatus(lockerAddress, gdaPoolAddress) {
        try {
            logger_1.default.info(`Checking claim status for address ${lockerAddress} on GDA pool ${gdaPoolAddress}`);
            const memberUnits = await this.client.readContract({
                address: gdaPoolAddress,
                abi: gdaPoolAbi,
                functionName: 'getUnits',
                args: [lockerAddress]
            });
            return memberUnits;
        }
        catch (error) {
            logger_1.default.error(`Failed to check claim status for address ${lockerAddress} on GDA pool ${gdaPoolAddress}`, { error });
            // Default to not claimed in case of error
            return BigInt(0);
        }
    }
    /**
     * Get the locker addresses for multiple addresses
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses for each address
     */
    async getLockerAddresses(addresses) {
        const lockerAddresses = new Map();
        for (const address of addresses) {
            const [exists, lockerAddress] = await this.client.readContract({
                address: config_1.default.lockerFactoryAddress,
                abi: getUserLockerAbi,
                functionName: 'getUserLocker',
                args: [address.toLowerCase()]
            });
            if (exists) {
                lockerAddresses.set(address, lockerAddress);
            }
        }
        return lockerAddresses;
    }
    /**
     * Check claim status for multiple addresses across all GDA pools
     * @param lockerAddresses Map of addresses to their locker addresses
     * @returns Promise with claim status for each address and GDA pool
     */
    async checkAllClaimStatuses(lockerAddresses) {
        const allClaimStatuses = new Map();
        // Initialize the map for each address
        lockerAddresses.forEach((lockerAddress, address) => {
            allClaimStatuses.set(address, new Map());
        });
        // Process each address and point system combination
        const promises = [];
        for (const [address, lockerAddress] of lockerAddresses.entries()) {
            for (const { id, gdaPoolAddress } of config_1.default.pointSystems) {
                promises.push((async () => {
                    try {
                        const memberUnits = await this.client.readContract({
                            address: gdaPoolAddress,
                            abi: gdaPoolAbi,
                            functionName: 'getUnits',
                            args: [lockerAddress]
                        });
                        const statusMap = allClaimStatuses.get(address);
                        if (statusMap) {
                            statusMap.set(id, memberUnits);
                        }
                    }
                    catch (error) {
                        logger_1.default.error(`Error checking claim status for address ${address} on point system ${id}`, { error });
                        // Set default status in case of error
                        const statusMap = allClaimStatuses.get(address);
                        if (statusMap) {
                            statusMap.set(id, BigInt(0));
                        }
                    }
                })());
            }
        }
        // Wait for all promises to resolve
        await Promise.all(promises);
        return allClaimStatuses;
    }
    /**
     * Get locker addresses from the subgraph
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses and block timestamps
     */
    async getLockers(addresses) {
        const lockerAddresses = new Map();
        let hasMore = true;
        let skip = 0;
        const pageSize = 1000;
        const query = `query MyQuery {
      lockers(first: ${pageSize}, skip: ${skip}, orderBy: blockTimestamp, orderDirection: desc) {
        lockerOwner
        id
        blockTimestamp
      }
    }`;
        while (hasMore) {
            try {
                const response = await axios_1.default.post(config_1.default.LOCKER_GRAPH_URL, {
                    query
                });
                const lockers = response.data?.data?.lockers || [];
                // Process lockers and match with addresses we're looking for
                for (const locker of lockers) {
                    const ownerAddress = locker.lockerOwner.toLowerCase();
                    if (addresses.some(addr => addr.toLowerCase() === ownerAddress)) {
                        lockerAddresses.set(ownerAddress, { lockerAddress: locker.id, blockTimestamp: locker.blockTimestamp });
                    }
                }
                // Check if we've found all addresses or need to fetch more pages
                if (lockerAddresses.size === addresses.length || lockers.length < pageSize) {
                    hasMore = false;
                }
                else {
                    skip += pageSize;
                }
                // Exit early if we've found all addresses
                if (lockerAddresses.size === addresses.length) {
                    break;
                }
            }
            catch (error) {
                logger_1.default.error('Error fetching lockers from subgraph', { error });
                hasMore = false;
            }
        }
        return lockerAddresses;
    }
}
exports.default = new BlockchainService();
//# sourceMappingURL=blockchainService.js.map