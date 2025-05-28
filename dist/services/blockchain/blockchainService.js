"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const config_1 = __importDefault(require("../../config"));
const logger_1 = __importDefault(require("../../utils/logger"));
const p_memoize_1 = __importDefault(require("p-memoize"));
const cache_1 = require("../../config/cache");
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
        inputs: [{ name: "user", type: "address" }],
        name: "getUserLocker",
        outputs: [{ name: "isCreated", type: "bool" }, { name: "lockerAddress", type: "address" }],
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
        try {
            logger_1.default.info("about to create client");
            logger_1.default.info(`using the baseRpcUrl: ${config_1.default.baseRpcUrl}`);
            this.client = (0, viem_1.createPublicClient)({
                chain: chains_1.base,
                transport: (0, viem_1.http)(config_1.default.baseRpcUrl)
            });
            logger_1.default.info("client created successfully");
            logger_1.default.info(`client: ${this.client}`);
        }
        catch (error) {
            logger_1.default.error("Failed to create blockchain client", { error });
            throw error;
        }
    }
    getClient() {
        // @ts-ignore
        return (0, viem_1.createPublicClient)({
            chain: chains_1.base,
            transport: (0, viem_1.http)(config_1.default.baseRpcUrl)
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
    // get total units from memoized cache
    // keep cache in memory for 1 hour
    async getTotalUnitsMemoized(gdaPoolAddress) {
        const cachedValue = (0, p_memoize_1.default)(this.getTotalUnits.bind(this), {
            cache: cache_1.oneHourCache,
            cacheKey: () => `totalUnits:${gdaPoolAddress}`
        });
        return cachedValue(gdaPoolAddress);
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
     * Get the locker addresses for multiple addresses (memoized)
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses for each address
     */
    async getLockerAddressesMemoized(addresses) {
        const lockerAddresses = new Map();
        for (const address of addresses) {
            lockerAddresses.set(address, await this.getLockerAddressMemoized(address));
        }
        return lockerAddresses;
    }
    /**
     * Get the locker address for an address (memoized)
     * @param address Ethereum address
     * @returns Promise with locker address
     */
    async getLockerAddressMemoized(address) {
        const cachedValue = (0, p_memoize_1.default)(this.getLockerAddress.bind(this), {
            cache: cache_1.halfDayCache,
            cacheKey: () => `lockerAddress:${address}`
        });
        return cachedValue(address);
    }
    /**
     * Get the locker addresses for multiple addresses
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses for each address
     */
    async getLockerAddresses(addresses) {
        const lockerAddresses = new Map();
        for (const address of addresses) {
            const lockerAddress = await this.getLockerAddress(address);
            lockerAddresses.set(address, lockerAddress);
        }
        return lockerAddresses;
    }
    async getLockerAddress(address) {
        logger_1.default.info(`Getting locker address for ${address} from the blockchain`);
        logger_1.default.info(`using the address  : ${config_1.default.lockerFactoryAddress}`);
        logger_1.default.info(`using the abi      : ${getUserLockerAbi}`);
        logger_1.default.info(`using the function : ${'getUserLocker'}`);
        logger_1.default.info(`using the args     : ${address.toLowerCase()}`);
        try {
            const [exists, lockerAddress] = await this.getClient().readContract({
                address: config_1.default.lockerFactoryAddress,
                abi: getUserLockerAbi,
                functionName: 'getUserLocker',
                args: [address.toLowerCase()]
            });
            logger_1.default.info(`Locker address for ${address}, which exists: ${exists}, is ${lockerAddress}`);
            if (!exists) {
                logger_1.default.info(`No locker address found for ${address}`);
                return "0x0000000000000000000000000000000000000000";
            }
            return lockerAddress;
        }
        catch (error) {
            logger_1.default.error(`Failed to get locker address for ${address}`, { error });
            return "0x0000000000000000000000000000000000000000";
        }
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
                if (!lockerAddress || lockerAddress === "0x0000000000000000000000000000000000000000") {
                    logger_1.default.info(`No locker address found for ${address}`);
                    allClaimStatuses.get(address)?.set(id, BigInt(0));
                    continue;
                }
                promises.push((async () => {
                    try {
                        const memberUnits = await this.checkClaimStatus(lockerAddress, gdaPoolAddress);
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
}
exports.default = new BlockchainService();
//# sourceMappingURL=blockchainService.js.map