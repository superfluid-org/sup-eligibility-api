export interface UniversalPointRecipient {
    address: string;
    topUpDate: string;
    claimed?: boolean;
    lastChecked?: string;
}
/**
 * Get stored recipients from the data file
 * @returns Array of recipients
 */
export declare const getStoredRecipients: () => UniversalPointRecipient[];
/**
 * Get recipients data, optionally with cache control
 * @param cache Whether to use cached data (default: true)
 * @returns Promise with recipients data
 */
export declare const getRecipients: (cache?: number) => Promise<UniversalPointRecipient[]>;
/**
 * Add a new recipient to the data file
 * @param recipient Recipient data to add
 * @returns Boolean indicating success
 */
export declare const addRecipient: (recipient: Partial<UniversalPointRecipient>) => boolean;
/**
 * Update an existing recipient
 * @param address Address of the recipient to update
 * @param updates Updates to apply
 * @returns Boolean indicating success
 */
export declare const updateRecipient: (address: string, updates: Partial<UniversalPointRecipient>) => boolean;
/**
 * Get a recipient by address
 * @param address Ethereum address
 * @returns Recipient data or null if not found
 */
export declare const getRecipient: (address: string) => UniversalPointRecipient | null;
/**
 * Get high-level statistics about recipients
 * @returns Promise with statistics
 */
export declare const getHighLevelStats: () => Promise<{
    totalRecipients: number;
    totalRecipientsWithClaim: number;
}>;
/**
 * Get recipients that were topped up within the specified time period
 * @param timePeriod Time period in seconds
 * @returns Array of recipients
 */
export declare const latestRecipients: (timePeriod: number) => UniversalPointRecipient[];
