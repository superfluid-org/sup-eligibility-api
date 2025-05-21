import fs from 'fs';
import path from 'path';
import logger from './logger';
import axios from 'axios';
import blockchainService from '../services/blockchain/blockchainService';

// Path to the data file
const DATA_FILE_PATH = path.join(__dirname, '../../data/UniversalPointRecipients.json');

// Ensure the data directory exists
const dataDir = path.dirname(DATA_FILE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Define the interface for recipients
export interface UniversalPointRecipient {
  address: string;
  topUpDate: string;
  lockerAddress?: string;
  lockerCheckedDate?: string;
  claimed?: boolean;
  lastChecked?: string;
}

/**
 * Get stored recipients from the data file
 * @returns Array of recipients
 */
export const getStoredRecipients = (): UniversalPointRecipient[] => {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      // If file doesn't exist, create it with empty array
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to read recipients data', { error });
    return [];
  }
};

/**
 * Get recipients data, optionally with cache control
 * @param cache Whether to use cached data (default: true)
 * @returns Promise with recipients data
 */
export const getRecipients = async (cache?: number): Promise<UniversalPointRecipient[]> => {
  // TODO: Implement cache logic if needed
  return getStoredRecipients();
};

/**
 * Save recipients data to file
 * @param recipients Array of recipients to save
 * @returns Boolean indicating success
 */
const saveRecipients = (recipients: UniversalPointRecipient[]): boolean => {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(recipients, null, 2));
    return true;
  } catch (error) {
    logger.error('Failed to save recipients data', { error });
    return false;
  }
};

/**
 * Add a new recipient to the data file
 * @param recipient Recipient data to add
 * @returns Boolean indicating success
 */
export const addRecipient = (recipient: Partial<UniversalPointRecipient>): boolean => {
  if (!recipient.address) {
    logger.error('Attempted to add recipient without address');
    return false;
  }

  try {
    const recipients = getStoredRecipients();
    const now = new Date().toISOString();
    
    // Check if recipient already exists
    const existingIndex = recipients.findIndex(
      r => r.address.toLowerCase() === recipient.address!.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing recipient
      recipients[existingIndex] = {
        ...recipients[existingIndex],
        ...recipient,
        topUpDate: now,
      };
    } else {
      // Add new recipient
      recipients.push({
        address: recipient.address,
        topUpDate: now,
        ...recipient,
      } as UniversalPointRecipient);
    }
    
    return saveRecipients(recipients);
  } catch (error) {
    logger.error('Failed to add recipient', { error, recipient });
    return false;
  }
};

/**
 * Update an existing recipient
 * @param address Address of the recipient to update
 * @param updates Updates to apply
 * @returns Boolean indicating success
 */
export const updateRecipient = (address: string, updates: Partial<UniversalPointRecipient>): boolean => {
  try {
    const recipients = getStoredRecipients();
    
    const recipientIndex = recipients.findIndex(
      r => r.address.toLowerCase() === address.toLowerCase()
    );
    
    if (recipientIndex === -1) {
      logger.warn(`Attempted to update non-existent recipient: ${address}`);
      return false;
    }
    
    recipients[recipientIndex] = {
      ...recipients[recipientIndex],
      ...updates,
    };
    
    return saveRecipients(recipients);
  } catch (error) {
    logger.error('Failed to update recipient', { error, address, updates });
    return false;
  }
};

/**
 * Get a recipient by address
 * @param address Ethereum address
 * @returns Recipient data or null if not found
 */
export const getRecipient = (address: string): UniversalPointRecipient | null => {
  try {
    const recipients = getStoredRecipients();
    return recipients.find(
      r => r.address.toLowerCase() === address.toLowerCase()
    ) || null;
  } catch (error) {
    logger.error('Failed to get recipient', { error, address });
    return null;
  }
};

/**
 * Check all recipients for eligibility and update their statuses
 */
export const checkRecipients = async (cacheInvalidation?:number): Promise<void> => {
  const recipients = getStoredRecipients();
  const cacheInvalidationDuration = cacheInvalidation || 1000 * 60 * 20;
  
  // Filter recipients that need to be checked (no locker or stale data)
  const recipientsToCheck = recipients.filter(r => 
    !r.lockerAddress && 
    (!r.lastChecked || new Date(r.lastChecked) < new Date(Date.now() - cacheInvalidationDuration))
  );
  
  if (recipientsToCheck.length === 0) {
    return;
  }
  
  const recipientAddressList = recipientsToCheck.map(r => r.address);
  
  try {
    const lockerAddresses = await blockchainService.getLockers(recipientAddressList);
    
    for (const recipient of recipientsToCheck) {
      const lockerAddress = lockerAddresses.get(recipient.address.toLowerCase());
      if (lockerAddress) {
        updateRecipient(recipient.address, { 
          lockerAddress: lockerAddress.lockerAddress,
          lockerCheckedDate: lockerAddress.blockTimestamp
        });
      }
      recipient.lastChecked = new Date().toISOString();
      updateRecipient(recipient.address, { lastChecked: recipient.lastChecked });
    }
  } catch (error) {
    logger.error('Failed to check recipients', { error });
  }
}

/**
 * Get high-level statistics about recipients
 * @returns Promise with statistics
 */
export const getHighLevelStats = async (): Promise<{
  totalRecipients: number;
  totalRecipientsWithLocker: number;
  totalRecipientsWithClaim: number;
}> => {
  const recipients = await getRecipients();
  
  return {
    totalRecipients: recipients.length,
    totalRecipientsWithLocker: recipients.filter(r => r.lockerAddress).length,
    totalRecipientsWithClaim: recipients.filter(r => r.claimed).length,
  };
};

/**
 * Get recipients that were topped up within the specified time period
 * @param timePeriod Time period in seconds
 * @returns Array of recipients
 */
export const latestRecipients = (timePeriod: number): UniversalPointRecipient[] => {
  const recipients = getStoredRecipients();
  const now = new Date();
  const cutoff = new Date(now.getTime() - timePeriod * 1000);
  
  return recipients.filter(recipient => {
    const topUpDate = new Date(recipient.topUpDate);
    return topUpDate >= cutoff;
  });
}; 