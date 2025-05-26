# Eligibility API Client Implementation Plan

This document outlines the plan for implementing the API client that will be used by the main application to communicate with the separated Eligibility API.

## Client Requirements

1. **Functional Requirements**
   - Maintain the same functionality as the current direct service calls
   - Handle authentication with API keys
   - Implement error handling and retries
   - Maintain type safety

2. **Non-Functional Requirements**
   - Minimize latency
   - Implement caching to reduce API calls
   - Add proper logging for debugging
   - Support both development and production environments

## API Client Implementation

### 1. Client Class Structure

```typescript
// src/services/eligibility/eligibilityApiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AddressEligibility, PointSystemDetails } from '../../models/types';
import logger from '../../utils/logger';
import config from '../../config';
import { halfDayCache } from '../../config/cache';

class EligibilityApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = config.eligibilityApiBaseUrl;
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.eligibilityApiKey
      }
    });
    
    // Add request interceptor for logging
    this.client.interceptors.request.use((config) => {
      logger.debug('Making request to Eligibility API', {
        url: config.url,
        method: config.method,
        params: config.params
      });
      return config;
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Eligibility API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Check eligibility for multiple addresses
   * @param addresses Array of Ethereum addresses
   * @returns Promise with eligibility data for each address
   */
  async checkEligibility(addresses: string[]): Promise<AddressEligibility[]> {
    try {
      // Build URL with addresses as query parameter
      const params = new URLSearchParams();
      params.append('addresses', addresses.join(','));
      
      const response = await this.client.get('/eligibility', { params });
      return response.data.results;
    } catch (error) {
      logger.error('Failed to check eligibility', { error, addresses });
      throw new Error(`Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get all point systems
   * @returns Promise with point system details
   */
  async getPointSystems(): Promise<PointSystemDetails[]> {
    try {
      const response = await this.client.get('/point-systems');
      return response.data.pointSystems;
    } catch (error) {
      logger.error('Failed to get point systems', { error });
      throw new Error(`Failed to get point systems: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check health of the Eligibility API
   * @returns Promise with health status
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Health check failed', { error });
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create a singleton instance
export default new EligibilityApiClient();
```

### 2. Configuration Updates

Add the following configuration to `src/config/index.ts`:

```typescript
// Eligibility API configuration
eligibilityApiBaseUrl: process.env.ELIGIBILITY_API_BASE_URL || 'http://localhost:3001',
eligibilityApiKey: process.env.ELIGIBILITY_API_KEY || '',
```

### 3. Environment Variable Updates

Update the `.env` file and `.env.example` with:

```
# Eligibility API
ELIGIBILITY_API_BASE_URL=https://eligibility-api.example.com
ELIGIBILITY_API_KEY=spr_eligibility_YOUR_API_KEY_HERE
```

## Integration with Existing Code

### 1. Update ReferralService

The `referralService.ts` file currently imports and uses `eligibilityService` directly. We need to update it to use the new API client:

```typescript
// Before
import eligibilityService from './eligibilityService';
// ...
const eligibilityResults = await eligibilityService.checkEligibility([address]);

// After
import eligibilityApiClient from './eligibility/eligibilityApiClient';
// ...
const eligibilityResults = await eligibilityApiClient.checkEligibility([address]);
```

### 2. Update Any Other Services

Any other services that import and use the eligibility service directly should be updated similarly.

## Caching Strategy

To reduce API calls and improve performance, implement caching:

```typescript
import pMemoize from 'p-memoize';
import { halfDayCache } from '../../config/cache';

// Memoized checkEligibility function
const checkEligibilityMemoized = pMemoize(
  async (addresses: string[]) => {
    // Call the actual API
    const response = await this.client.get('/eligibility', {
      params: { addresses: addresses.join(',') }
    });
    return response.data.results;
  },
  {
    cache: halfDayCache,
    cacheKey: (args) => `eligibility-check-${args[0].join('-').toLowerCase()}`
  }
);
```

## Error Handling and Retries

Implement a retry mechanism for transient failures:

```typescript
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure retry logic
axiosRetry(this.client, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Exponential backoff
  },
  retryCondition: (error) => {
    // Only retry on network errors or 5xx responses
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response && error.response.status >= 500);
  }
});
```

## Fallback Mechanism

In case the Eligibility API is completely unavailable, implement a fallback:

```typescript
async checkEligibility(addresses: string[]): Promise<AddressEligibility[]> {
  try {
    // Try the API first
    const response = await this.client.get('/eligibility', {
      params: { addresses: addresses.join(',') }
    });
    return response.data.results;
  } catch (error) {
    logger.error('Eligibility API failed, using fallback', { error });
    
    // Fallback: return a minimally viable response
    return addresses.map(address => ({
      address,
      hasAllocations: false,
      claimNeeded: false,
      totalFlowRate: "0",
      eligibility: []
    }));
  }
}
```

## Testing Strategy

1. **Unit Tests**
   - Test the client with mocked axios responses
   - Verify error handling and retries
   - Test caching functionality

2. **Integration Tests**
   - Test against a mock Eligibility API server
   - Verify all endpoints work correctly
   - Test error scenarios and fallbacks

3. **End-to-End Tests**
   - Test the full communication between the main app and actual Eligibility API
   - Verify authentication works properly
   - Test performance under load

## Migration Plan

1. **Preparation**
   - Create the API client while maintaining the existing eligibility service
   - Run both in parallel for testing
   - Log any discrepancies between the two implementation results

2. **Gradual Transition**
   - Modify one service at a time to use the new API client
   - Monitor for errors and performance issues
   - Have a rollback plan for each service

3. **Complete Migration**
   - Once all services are successfully using the API client
   - Remove the old eligibility service code from the main repository
   - Update documentation to reflect the new architecture 