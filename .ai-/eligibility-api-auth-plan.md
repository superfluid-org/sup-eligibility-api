# Simplified Eligibility API Authentication Plan

This document outlines the simplified plan for implementing API key authentication for the Eligibility API.

## Authentication Requirements

1. **API Key Management**
   - API keys will be configured via environment variables
   - Multiple API keys can be supported for different clients
   - API keys can be enabled/disabled by updating environment variables

2. **Authorization Levels**
   - Simple "allowed/not allowed" authorization model
   - No complex permission levels or role-based access

3. **Security Requirements**
   - Keys should be transmitted securely (HTTPS only)
   - Comprehensive logging of key usage to Slack for audit purposes

## Implementation Plan

### 1. API Key Configuration via Environment Variables

```
# .env file example
ELIGIBILITY_API_KEYS=key1,key2,key3
ELIGIBILITY_API_KEY_NAMES=main-app,dashboard,monitoring
```

The system will parse these comma-separated lists into a mapping of keys to names. This approach:
- Avoids database dependencies
- Makes key management as simple as updating and redeploying the .env file
- Keeps a human-readable name associated with each key for logging purposes

### 2. In-Memory API Key Storage

```typescript
// Example implementation for loading keys from environment
interface ApiKey {
  key: string;         // The API key itself
  name: string;        // A human-readable name for the key (e.g., "Main App")
  active: boolean;     // Whether the key is active (always true in this implementation)
}

// Load API keys from environment variables
function loadApiKeys(): Map<string, ApiKey> {
  const keys = process.env.ELIGIBILITY_API_KEYS?.split(',').trim() || [];
  const names = process.env.ELIGIBILITY_API_KEY_NAMES?.split(',').trim() || [];
  
  const apiKeys = new Map<string, ApiKey>();
  
  keys.forEach((key, index) => {
    apiKeys.set(key, {
      key,
      name: names[index] || `api-key-${index}`,
      active: true
    });
  });
  
  return apiKeys;
}

// Create a global map of API keys for validation
const API_KEYS = loadApiKeys();
```

### 3. Simple API Key Validation Middleware

```typescript
// Middleware to validate API keys
const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation in development if configured to do so
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_API_KEY_AUTH === 'true') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API request missing API key', { 
      path: req.path,
      ip: req.ip
    });
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required',
      statusCode: 401
    });
  }
  
  // Check if API key exists
  const keyData = API_KEYS.get(apiKey as string);
  
  if (!keyData) {
    logger.warn('Invalid API key used', { 
      path: req.path,
      ip: req.ip
    });
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      statusCode: 401
    });
  }
  
  // Log API key usage to Slack for audit purposes
  logger.info('API key used', { 
    keyName: keyData.name,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Add key data to request for logging
  req.apiKeyData = {
    name: keyData.name
  };
  
  next();
};
```

### 4. Usage Analytics with localStorage

If simple analytics about API key usage are needed, we can use Node.js's file system to store usage data:

```typescript
// Simple utility to track API key usage
const trackApiKeyUsage = (keyName: string, endpoint: string) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageFile = path.join(__dirname, '../data/api-usage.json');
    
    // Create/read the usage file
    let usage = {};
    if (fs.existsSync(usageFile)) {
      const fileContent = fs.readFileSync(usageFile, 'utf8');
      usage = JSON.parse(fileContent);
    }
    
    // Update usage data
    if (!usage[today]) {
      usage[today] = {};
    }
    if (!usage[today][keyName]) {
      usage[today][keyName] = {};
    }
    if (!usage[today][keyName][endpoint]) {
      usage[today][keyName][endpoint] = 0;
    }
    
    usage[today][keyName][endpoint]++;
    
    // Write updated data back to file
    fs.writeFileSync(usageFile, JSON.stringify(usage, null, 2));
  } catch (error) {
    logger.error('Error tracking API key usage', { error });
    // Non-critical operation, so we just log the error and continue
  }
};
```

### 5. Slack Notification for Security Events

Use your existing logger with Slack integration for security-related events:

```typescript
// Log significant security events to Slack
const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.slackNotify(`Security Event: ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Examples of security events to log
// logSecurityEvent('Invalid API key used', { keyAttempt: '****', ip: req.ip });
// logSecurityEvent('Multiple authentication failures', { ip: req.ip, count: failures });
```

## Client Implementation

Clients of the Eligibility API will still need to include the API key in their requests:

```typescript
// Example API client implementation
class EligibilityApiClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async checkEligibility(addresses: string[]): Promise<AddressEligibility[]> {
    const url = `${this.baseUrl}/eligibility?addresses=${addresses.join(',')}`;
    
    const response = await axios.get(url, {
      headers: {
        'x-api-key': this.apiKey
      }
    });
    
    return response.data.results;
  }
  
  // Other methods...
}
```

## Key Management Workflow

1. **Generate New Keys**
   - Admin manually generates a secure random string (e.g., using a tool like `openssl rand -hex 16`)
   - Admin adds the key to the ELIGIBILITY_API_KEYS environment variable
   - Admin adds a corresponding name to ELIGIBILITY_API_KEY_NAMES
   - Server is restarted to load the new keys

2. **Revoke Keys**
   - Admin removes the key from ELIGIBILITY_API_KEYS environment variable
   - Admin removes the corresponding name from ELIGIBILITY_API_KEY_NAMES
   - Server is restarted to apply the changes

3. **Key Rotation**
   - Generate a new key and add it to the environment variables
   - Update client applications to use the new key
   - After all clients have migrated, remove the old key

## Security Considerations

1. **Environment Variable Security**
   - Ensure .env files are not committed to version control
   - Use secure environment variable handling in your deployment platform
   - Consider using a secrets manager for production environments

2. **Monitoring and Alerting**
   - Review Slack logs regularly for suspicious activity
   - Set up Slack channel alerts for important security events

3. **Key Generation Security**
   - Use cryptographically secure methods to generate API keys
   - Recommend a minimum key length (e.g., 32 characters)

## Testing Plan

1. **Unit Tests**
   - Test API key validation middleware
   - Test environment variable parsing

2. **Integration Tests**
   - Test authentication workflow with valid and invalid keys
   - Verify Slack logging for security events

This simplified approach maintains adequate security while minimizing dependencies and complexity. 