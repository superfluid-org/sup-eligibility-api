import { AddressEligibility } from '../models/types';
declare class EligibilityService {
    /**
     * Check eligibility for multiple addresses across all point systems
     * @param addresses Array of Ethereum addresses
     * @returns Promise with eligibility data for each address
     */
    checkEligibility(addresses: string[]): Promise<AddressEligibility[]>;
    /**
     * Private implementation of eligibility check
     * @param addresses Array of Ethereum addresses
     * @returns Promise with eligibility data for each address
     */
    private _checkEligibility;
    /**
     * Memoized version of eligibility check to reduce API calls
     */
    private checkEligibilityMemoized;
    /**
     * Auto-assign points to addresses with less than threshold points
     * @param addresses Array of Ethereum addresses to check and assign points to
     * @param allAllocations Current allocations map from Stack API
     */
    private autoAssignPoints;
}
declare const _default: EligibilityService;
export default _default;
