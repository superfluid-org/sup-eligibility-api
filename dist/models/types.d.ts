export interface StackAllocation {
    pointSystemUuid: string;
    accountAddress: string;
    points: number;
    maxCreatedAt: string;
    allocation: bigint;
}
export interface StackApiResponse {
    res: {
        total: number;
        allocations: StackAllocation[];
    };
}
export interface PointSystemEligibility {
    pointSystemId: number;
    pointSystemName: string;
    eligible: boolean;
    points: number;
    claimedAmount: number;
    needToClaim: boolean;
    gdaPoolAddress: string;
    estimatedFlowRate: string;
}
export interface AddressEligibility {
    address: string;
    eligibility: PointSystemEligibility[];
    claimNeeded: boolean;
    hasAllocations: boolean;
    totalFlowRate: string;
}
export interface EligibilityResponse {
    results: AddressEligibility[];
}
export interface PointSystemDetails {
    id: number;
    name: string;
    gdaPoolAddress: string;
    flowrate: bigint;
    totalUnits: number;
    color?: string;
}
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
}
export interface ApiKey {
    id: string;
    key: string;
    name: string;
    createdAt: Date;
    lastUsed: Date;
    permissions: string[];
    rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    active: boolean;
}
