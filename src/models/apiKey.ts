import { Request } from 'express';

export interface ApiKey {
  key: string;         // The API key itself
  name: string;        // A human-readable name for the key (e.g., "Main App")
  active: boolean;     // Whether the key is active (always true in this implementation)
}

// Extend Express Request to include API key data
declare global {
  namespace Express {
    interface Request {
      apiKeyData?: {
        name: string;
      };
    }
  }
}

/**
 * Load API keys from environment variables
 * @returns Map of API keys with their data
 */
export function loadApiKeys(): Map<string, ApiKey> {
  const keysString = process.env.ELIGIBILITY_API_KEYS || '';
  const namesString = process.env.ELIGIBILITY_API_KEY_NAMES || '';
  
  // Split and trim keys and names
  const keys = keysString.split(',').map(k => k.trim()).filter(Boolean);
  const names = namesString.split(',').map(n => n.trim()).filter(Boolean);
  
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