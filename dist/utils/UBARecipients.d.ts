export interface UniversalPointRecipient {
    address: string;
    topUpDate: string;
    lockerAddress?: string;
    lockerCheckedDate?: string;
    claimed?: boolean;
    lastChecked?: string;
}
/**
 * Read all recipients from storage file
 */
export declare const getStoredRecipients: () => UniversalPointRecipient[];
export declare const getRecipients: (cache?: number) => Promise<UniversalPointRecipient[]>;
/**
 * Add a new recipient to storage
 */
export declare const addRecipient: (recipient: Partial<UniversalPointRecipient>) => boolean;
/**
 * Update an existing recipient in storage
 */
export declare const updateRecipient: (address: string, updates: Partial<UniversalPointRecipient>) => boolean;
/**
 * Get a single recipient by address
 */
export declare const getRecipient: (address: string) => UniversalPointRecipient | null;
/**
 * Check all recipients for eligibility and update their statuses
 */
export declare const checkRecipients: (cacheInvalidation?: number) => Promise<void>;
export declare const getHighLevelStats: () => Promise<{
    totalRecipients: number;
    totalRecipientsWithLocker: number;
    totalRecipientsWithClaim: number;
}>;
/**
 * Check how many recipients have been topped up in a given time period
 * @param timePeriod - The time period in seconds
 */
export declare const latestRecipients: (timePeriod: number) => UniversalPointRecipient[];
