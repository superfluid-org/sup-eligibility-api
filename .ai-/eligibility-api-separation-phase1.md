# Eligibility API Separation - Phase 1: Analysis and Preparation

## 1. Eligibility API Components

Based on the analysis of the codebase, here's a comprehensive map of the Eligibility API components:

### Core Components

- **Services**
  - `src/services/eligibilityService.ts` - Main service for eligibility checks
  - `src/services/stack/stackApiService.ts` - API service for interaction with Stack platform
  - `src/services/blockchain/blockchainService.ts` - Service for blockchain interactions (Viem-based)

### Supporting Components

- **Models**
  - `src/models/types.ts` - Contains essential types:
    - `AddressEligibility`
    - `PointSystemEligibility`
    - `StackAllocation`
    - `StackApiResponse`

- **Controllers**
  - `src/controllers/eligibilityController.ts` - Contains the API endpoints:
    - `checkEligibility` - Main eligibility check endpoint
    - `getPointSystems` - Endpoint to get all point systems
    - `healthCheck` - Health check endpoint

- **Utils**
  - `src/utils/logger.ts` - Logging functionality
  - `src/utils/UBARecipients.ts` - Contains the `latestRecipients` utility and recipient management
  - `src/services/stack/formatUtils.ts` - Formatting utilities for Stack API responses

- **Config**
  - `src/config/index.ts` - Main configuration (contains point system configs)
  - `src/config/cache.ts` - Cache configuration

- **Routes**
  - Routes are defined directly in `src/app.ts`:
    - `GET /eligibility` - Maps to `eligibilityController.checkEligibility`
    - `GET /point-systems` - Maps to `eligibilityController.getPointSystems`
    - `GET /health` - Maps to `eligibilityController.healthCheck`

## 2. Dependency Analysis

### Direct Dependencies

From `eligibilityService.ts`, we've identified the following direct dependencies:

```
import stackApiService from './stack/stackApiService';
import blockchainService from './blockchain/blockchainService';
import logger from '../utils/logger';
import config from '../config';
import { AddressEligibility, PointSystemEligibility, StackAllocation } from '../models/types';
import { latestRecipients } from '../utils/UBARecipients';
import { halfDayCache } from '../config/cache';
```

### Circular Dependencies

We've identified the following circular dependencies:

1. `UBARecipients.ts` imports `eligibilityService` but also `eligibilityService` uses `latestRecipients` from `UBARecipients`. This circular dependency needs to be resolved in the separation.

2. `referralService.ts` imports and uses `eligibilityService` for checking eligibility of addresses. This will need to be updated to use the new API client.

### External Service Dependencies

1. **Stack API Service**
   - Methods used:
     - `fetchAllAllocations(addresses)` - Fetches allocations for addresses across point systems
     - `assignPoints(address, points, eventName)` - Assigns points to an address

2. **Blockchain Service**
   - Methods used:
     - `checkAllClaimStatuses(lockerAddresses)` - Checks claim status for addresses
     - `getTotalUnits(gdaPoolAddress)` - Gets total units for a point system
     - `getUserNonce(address)` - Gets transaction count for an address

### Configuration Dependencies

The service relies on the following configuration constants:
- `POINT_THRESHOLD`
- `POINTS_TO_ASSIGN`
- `COMMUNITY_ACTIVATION_ID` 
- `THRESHOLD_TIME_PERIOD`
- `THRESHOLD_MAX_USERS`
- `pointSystems` array with properties

### Environment Variables

The Eligibility API requires the following environment variables:
- `STACK_API_KEY` - API key for Stack read operations
- `STACK_WRITE_API_KEY` - API key for Stack write operations
- `ETHEREUM_RPC_URL` - RPC URL for blockchain interactions
- Likely others in the config file that will need to be identified

## 3. API Endpoints

Based on the `eligibilityController.ts` file, the API exposes the following endpoints:

1. **GET /eligibility**
   - Query Parameters: `addresses` (comma-separated list of Ethereum addresses)
   - Response: Eligibility status for each address, including point system allocations and claim status
   - Status Codes:
     - 200: Success
     - 400: Bad Request (missing or invalid addresses)
     - 500: Internal Server Error

2. **GET /point-systems**
   - Response: List of all point systems with their details
   - Status Codes:
     - 200: Success
     - 500: Internal Server Error

3. **GET /health**
   - Response: Health status of the API
   - Status Codes:
     - 200: Success
     - 500: Internal Server Error

## 4. Migration Strategy

### Files to Move to New Repository

1. **Core Services**
   - `src/services/eligibilityService.ts`
   - `src/services/stack/stackApiService.ts`
   - `src/services/blockchain/blockchainService.ts`
   - `src/services/stack/formatUtils.ts`

2. **Supporting Files**
   - `src/controllers/eligibilityController.ts`
   - `src/utils/UBARecipients.ts` (refactor to remove circular dependency)
   - `src/models/types.ts` (eligibility-related types)
   - Essential parts of `src/config/index.ts` and `src/config/cache.ts`

3. **Data Storage**
   - `data/UniversalPointRecipients.json` - Storage file for recipients

### Files to Copy (Shared Dependencies)

1. **Utilities**
   - `src/utils/logger.ts`
   - `src/config/cache.ts`

2. **Configuration**
   - Create new configuration structure based on `src/config/index.ts`

### Dependencies to Maintain

1. **API Client**
   - Create a new API client in the main app to communicate with the Eligibility API
   - Update `referralService.ts` to use the new API client instead of directly importing `eligibilityService`

### Package.json Dependencies

The new repository will need:
- `viem` for blockchain interactions
- `express` for the API server
- `axios` for HTTP requests
- `p-memoize` for caching (if still needed)
- Other utilities from the original package.json

## 5. Breaking Changes and Considerations

1. **Circular Dependencies Resolution**
   - The circular dependency between `eligibilityService` and `UBARecipients` must be resolved
   - Consider extracting common functionality to a separate module

2. **Data Storage**
   - The `UniversalPointRecipients.json` file needs to be handled carefully
   - Consider implementing a database solution instead of file storage

3. **Environment Separation**
   - Environment variables will need to be set up in the new repository
   - API keys for Stack API need to be securely managed

4. **API Authentication**
   - New API key validation middleware needs to be implemented
   - Consider implementing rate limiting

## 6. Next Steps for Implementation

1. **Further Analysis Needed**
   - Full list of required environment variables
   - Complete understanding of the recipient tracking system

2. **Repository Structure Planning**
   - Design the new repository structure
   - Plan shared library structure for common types/utilities

3. **API Design**
   - Design the new API endpoints with authentication
   - Plan API versioning strategy
   - Define request/response schemas

4. **Testing Strategy**
   - Plan how to test the API in isolation
   - Create test data and fixtures
   - Design integration tests between main app and new API 