# Eligibility API

A standalone API service for checking eligibility status across different point systems.

## Overview

The Eligibility API provides a centralized service for determining user eligibility based on their allocations in various point systems. This API was separated from the main application to allow for independent scaling, deployment, and maintenance.

## Features

- Check eligibility for multiple Ethereum addresses
- Get information about available point systems
- Secure API with authentication and rate limiting
- Automatic point assignment for eligible addresses

## Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Redis (for caching and rate limiting)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-org/eligibility-api.git
   cd eligibility-api
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Copy the example environment file and configure it
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

4. Start the server
   ```bash
   npm run start
   ```

### Environment Variables

```
# Server
PORT=3001
NODE_ENV=development

# Stack API
STACK_API_KEY=your_stack_api_key
STACK_WRITE_API_KEY=your_stack_write_api_key
STACK_API_BASE_URL=https://api.stack.so

# Blockchain
ETHEREUM_RPC_URL=https://mainnet.base.org
LOCKER_FACTORY_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
LOCKER_GRAPH_URL=https://api.thegraph.com/subgraphs/name/your-subgraph

# Point System Configuration
# These values are used to configure the eligibility check
POINT_THRESHOLD=99
POINTS_TO_ASSIGN=100
COMMUNITY_ACTIVATION_ID=7370
THRESHOLD_TIME_PERIOD=3600
THRESHOLD_MAX_USERS=100

# API Authentication
ADMIN_API_KEY=admin_api_key_for_managing_client_keys
```

## API Endpoints

### Eligibility Check

```
GET /eligibility?addresses=0x123,0x456
```

Check eligibility for one or more Ethereum addresses.

**Query Parameters**:
- `addresses`: Comma-separated list of Ethereum addresses

**Response**:
```json
{
  "results": [
    {
      "address": "0x123",
      "hasAllocations": true,
      "claimNeeded": true,
      "totalFlowRate": "12345678901234",
      "eligibility": [
        {
          "pointSystemId": 7370,
          "pointSystemName": "Community Activations",
          "eligible": true,
          "points": 100,
          "claimedAmount": 0,
          "needToClaim": true,
          "gdaPoolAddress": "0xabcd",
          "estimatedFlowRate": "12345678901234"
        }
      ]
    }
  ]
}
```

### Point Systems

```
GET /point-systems
```

Get information about all available point systems.

**Response**:
```json
{
  "pointSystems": [
    {
      "id": 7370,
      "name": "Community Activations",
      "gdaPoolAddress": "0xabcd",
      "flowrate": "1000000000",
      "totalUnits": 10000,
      "color": "#EC4899"
    }
  ]
}
```

### Health Check

```
GET /health
```

Check the health status of the API.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2023-09-01T12:00:00Z"
}
```

## Authentication

All API requests require an API key to be provided in the `x-api-key` header. Contact the administrator to get an API key.

## Rate Limiting

The API implements rate limiting to prevent abuse. The rate limits depend on the API key being used.

## Development

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
```

## Architecture

The Eligibility API follows a service-oriented architecture:

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Implement business logic
3. **Models**: Define data structures
4. **Utils**: Provide utility functions
5. **Config**: Configure the application

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Migration from Previous System

This API was previously part of a larger application. For clients that were using the eligibility service directly, you'll need to update your code to use the new API client. See [API Client Documentation](docs/api-client.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details. 