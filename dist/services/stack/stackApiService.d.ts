import { StackAllocation } from '../../models/types';
import { FormattedStackEvents } from './formatUtils';
declare class StackApiService {
    private baseUrl;
    private apiKey;
    private writeApiKey;
    constructor();
    /**
     * Fetch allocations for a specific point system and addresses
     * @param pointSystemId The ID of the point system
     * @param addresses Array of Ethereum addresses
     * @returns Promise with allocation data
     */
    fetchAllocations(pointSystemId: number, addresses: string[]): Promise<StackAllocation[]>;
    /**
     * Fetch allocations for multiple point systems and addresses
     * @param addresses Array of Ethereum addresses
     * @returns Promise with allocation data grouped by point system
     */
    fetchAllAllocations(addresses: string[]): Promise<Map<number, StackAllocation[]>>;
    /**
     * Assign points to an address in a specific point system
     * @param address Ethereum address to assign points to
     * @param points Number of points to assign
     * @param eventName Event name for the point assignment
     * @returns Promise with assignment result
     */
    assignPoints(address: string, points: number, eventName?: string): Promise<boolean>;
    /**
     * Get stack activity for all point systems for a specific address
     * @param address Ethereum address
     * @returns Promise with stack activity data
     */
    getStackActivityForAllPointSystems(address: string): Promise<FormattedStackEvents[]>;
    /**
     * Get stack activity for a specific address and point system
     * @param address Ethereum address
     * @param pointSystemId The ID of the point system
     * @returns Promise with stack activity data
     */
    getStackActivity(address: string, pointSystemId: number): Promise<FormattedStackEvents>;
}
declare const _default: StackApiService;
export default _default;
