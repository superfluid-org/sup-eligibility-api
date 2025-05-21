// Stack API response types
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

// Combined eligibility data
export interface PointSystemEligibility {
  pointSystemId: number;
  pointSystemName: string;
  eligible: boolean;
  points: number;
  claimedAmount: number;
  needToClaim: boolean;
  gdaPoolAddress: string;
  estimatedFlowRate: string; // Changed to string to preserve precision
}

export interface AddressEligibility {
  address: string;
  eligibility: PointSystemEligibility[];
  claimNeeded: boolean;
  hasAllocations: boolean;
  totalFlowRate: string; // Changed to string to preserve precision
}

// API response types
export interface EligibilityResponse {
  results: AddressEligibility[];
}

// Point system details
export interface PointSystemDetails {
  id: number;
  name: string;
  gdaPoolAddress: string;
  flowrate: bigint;
  totalUnits: number;
  color?: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// API Key types
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