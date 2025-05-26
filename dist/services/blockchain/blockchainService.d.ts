/**
 * Blockchain Service for interacting with Ethereum contracts
 * This service handles all blockchain interactions for the Eligibility API
 */
declare class BlockchainService {
    private client;
    constructor();
    /**
     * Get user's transaction count (nonce)
     * @param address Ethereum address
     * @returns Promise with transaction count
     */
    getUserNonce(address: `0x${string}`): Promise<number>;
    getTotalUnitsMemoized(gdaPoolAddress: string): Promise<bigint>;
    /**
     * Check the number of total units in a GDA pool
     * @param gdaPoolAddress Address of the GDA pool contract
     * @returns Promise with total units
     */
    getTotalUnits(gdaPoolAddress: string): Promise<bigint>;
    /**
     * Check if an address has claimed tokens for a specific GDA pool
     * @param lockerAddress Address of the locker contract
     * @param gdaPoolAddress Address of the GDA pool contract
     * @returns Promise with claim status (units)
     */
    checkClaimStatus(lockerAddress: string, gdaPoolAddress: string): Promise<bigint>;
    /**
     * Get the locker addresses for multiple addresses
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses for each address
     */
    getLockerAddresses(addresses: string[]): Promise<Map<string, string>>;
    /**
     * Check claim status for multiple addresses across all GDA pools
     * @param lockerAddresses Map of addresses to their locker addresses
     * @returns Promise with claim status for each address and GDA pool
     */
    checkAllClaimStatuses(lockerAddresses: Map<string, string>): Promise<Map<string, Map<number, bigint>>>;
    /**
     * Get locker addresses from the subgraph
     * @param addresses Array of Ethereum addresses
     * @returns Promise with locker addresses and block timestamps
     */
    getLockers(addresses: string[]): Promise<Map<string, {
        lockerAddress: string;
        blockTimestamp: string;
    }>>;
}
declare const _default: BlockchainService;
export default _default;
