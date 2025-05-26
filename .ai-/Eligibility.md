# Plan to Split the Repository and Separate the Eligibility API

## Phase 1: Analysis and Preparation

1. **Identify Eligibility API Components**
   - Map all code modules, files, and dependencies related to the Eligibility API
   - Identify shared utilities, configurations, and middleware used by both the API and main app
   - Document API routes, endpoints, and their functionality

2. **Dependency Analysis**
   - Identify all circular dependencies between the Eligibility API and main application
   - Catalog shared types, interfaces, and models
   - Document environment variables and configurations required by the API

3. **Create Migration Strategy Document**
   - Define which files will be moved vs. copied
   - List changes needed to package.json, dependencies, and build scripts
   - Prepare database migration plans if applicable

## Phase 2: Repository Setup

1. **Create New Repository**
   - Initialize a new git repository for the Eligibility API
   - Set up the basic folder structure (src, tests, config, etc.)
   - Configure CI/CD pipelines
   - Set up linting, formatting, and testing configurations

2. **Copy Core API Files**
   - Copy over all identified API components
   - Create a new package.json with required dependencies
   - Set up environment variable templates
   - Copy test files for API components

## Phase 3: Implementation

1. **Implement API Key Authentication**
   - Create an API key generation and validation system
   - Add middleware for API key validation on all endpoints
   - Set up secure storage for API keys
   - Implement rate limiting and monitoring

2. **Update Service Communication**
   - Modify the main application to communicate with the Eligibility API via HTTP
   - Implement API client in the main application
   - Update environment variables to include API base URL and keys
   - Add error handling and retries for API communication

3. **Extract Shared Code**
   - Move shared utilities to npm packages or copy to both repositories
   - Create shared type definitions that can be imported by both services
   - Ensure consistent data models across both services

## Phase 4: Testing and Deployment

1. **Test API Independently**
   - Ensure all API endpoints work correctly in isolation
   - Verify API key authentication works as expected
   - Test rate limiting and error handling
   - Validate that all API responses match the previous implementation

2. **Test Integration**
   - Test the main application with the newly separated API
   - Verify all functionality that depends on eligibility checks works properly
   - Test error scenarios and fallback mechanisms

3. **Deploy and Monitor**
   - Deploy the Eligibility API to its own environment
   - Update the main application to point to the new API
   - Monitor performance, errors, and response times
   - Set up alerts for API failures or slowdowns

## Phase 5: Clean-up and Documentation

1. **Remove Duplicated Code**
   - Remove the old Eligibility API code from the main repository
   - Clean up any temporary compatibility layers

2. **Update Documentation**
   - Document the new architecture
   - Create API documentation for the Eligibility API
   - Update setup instructions for both repositories
   - Document the API key request process

3. **Knowledge Transfer**
   - Ensure all team members understand the new architecture
   - Document lessons learned from the separation process

## Implementation Considerations

- Use proper versioning for the API to ensure backward compatibility
- Consider implementing a staging environment for the API to test changes
- Plan for data synchronization if both services need to share data
- Implement comprehensive logging in both services for debugging
- Consider using API gateway patterns if you anticipate adding more services in the future
