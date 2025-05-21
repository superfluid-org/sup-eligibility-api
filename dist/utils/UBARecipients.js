"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestRecipients = exports.getHighLevelStats = exports.checkRecipients = exports.getRecipient = exports.updateRecipient = exports.addRecipient = exports.getRecipients = exports.getStoredRecipients = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
const blockchainService_1 = __importDefault(require("../services/blockchain/blockchainService"));
const STORAGE_FILE = 'UniversalPointRecipients.json';
const STORAGE_PATH = path_1.default.join(__dirname, '..', '..', 'data', STORAGE_FILE);
/**
 * Read all recipients from storage file
 */
const getStoredRecipients = () => {
    try {
        if (!fs_1.default.existsSync(STORAGE_PATH)) {
            return [];
        }
        const data = fs_1.default.readFileSync(STORAGE_PATH, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        logger_1.default.error('Failed to read recipients from storage', { error });
        return [];
    }
};
exports.getStoredRecipients = getStoredRecipients;
const getRecipients = async (cache) => {
    await (0, exports.checkRecipients)(cache);
    return (0, exports.getStoredRecipients)();
};
exports.getRecipients = getRecipients;
/**
 * Write recipients to storage file
 * note: this is a private function and should only be called by the addRecipient and updateRecipient functions
 *       it is not exported from the module
 *       this is to avoid accidental corruption of the storage file
 */
const saveRecipients = (recipients) => {
    try {
        // Create the directory if it doesn't exist
        const dir = path_1.default.dirname(STORAGE_PATH);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(STORAGE_PATH, JSON.stringify(recipients, null, 2));
        return true;
    }
    catch (error) {
        logger_1.default.error('Failed to save recipients to storage', { error });
        logger_1.default.slackNotify(`Failed to save recipients to storage ${error}`, 'error');
        return false;
    }
};
/**
 * Add a new recipient to storage
 */
const addRecipient = (recipient) => {
    if (!recipient.address) {
        logger_1.default.error('Recipient address is required');
        return false;
    }
    if (!recipient.topUpDate) {
        recipient.topUpDate = new Date().toISOString();
    }
    try {
        const recipients = (0, exports.getStoredRecipients)();
        // Check if recipient already exists
        const existingIndex = recipients.findIndex(r => r.address.toLowerCase() === recipient.address.toLowerCase());
        if (existingIndex !== -1) {
            // Update the existing recipient instead of adding a duplicate
            recipients[existingIndex] = {
                ...recipients[existingIndex],
                ...recipient
            };
        }
        else {
            // Create a complete recipient object with all required fields
            const completeRecipient = {
                address: recipient.address,
                topUpDate: recipient.topUpDate,
                lockerAddress: recipient.lockerAddress,
                lockerCheckedDate: recipient.lockerCheckedDate,
                claimed: recipient.claimed,
                lastChecked: recipient.lastChecked
            };
            recipients.push(completeRecipient);
        }
        return saveRecipients(recipients);
    }
    catch (error) {
        logger_1.default.error('Failed to add recipient to storage', { error });
        return false;
    }
};
exports.addRecipient = addRecipient;
/**
 * Update an existing recipient in storage
 */
const updateRecipient = (address, updates) => {
    try {
        const recipients = (0, exports.getStoredRecipients)();
        const index = recipients.findIndex(r => r.address.toLowerCase() === address.toLowerCase());
        if (index === -1) {
            logger_1.default.error(`Recipient ${address} not found in storage`);
            return false;
        }
        recipients[index] = {
            ...recipients[index],
            ...updates
        };
        return saveRecipients(recipients);
    }
    catch (error) {
        logger_1.default.error('Failed to update recipient in storage', { error });
        return false;
    }
};
exports.updateRecipient = updateRecipient;
/**
 * Get a single recipient by address
 */
const getRecipient = (address) => {
    try {
        const recipients = (0, exports.getStoredRecipients)();
        return recipients.find(r => r.address.toLowerCase() === address.toLowerCase()) || null;
    }
    catch (error) {
        logger_1.default.error('Failed to get recipient from storage', { error });
        return null;
    }
};
exports.getRecipient = getRecipient;
/**
 * Check all recipients for eligibility and update their statuses
 */
const checkRecipients = async (cacheInvalidation) => {
    const recipients = (0, exports.getStoredRecipients)();
    const cacheInvalidationDuration = cacheInvalidation || 1000 * 60 * 20;
    // Filter recipients that need to be checked (no locker or stale data)
    const recipientsToCheck = recipients.filter(r => !r.lockerAddress &&
        (!r.lastChecked || new Date(r.lastChecked) < new Date(Date.now() - cacheInvalidationDuration)));
    if (recipientsToCheck.length === 0) {
        return;
    }
    const recipientAddressList = recipientsToCheck.map(r => r.address);
    try {
        const lockerAddresses = await blockchainService_1.default.getLockers(recipientAddressList);
        for (const recipient of recipientsToCheck) {
            const lockerAddress = lockerAddresses.get(recipient.address.toLowerCase());
            if (lockerAddress) {
                (0, exports.updateRecipient)(recipient.address, {
                    lockerAddress: lockerAddress.lockerAddress,
                    lockerCheckedDate: lockerAddress.blockTimestamp
                });
            }
            recipient.lastChecked = new Date().toISOString();
            (0, exports.updateRecipient)(recipient.address, { lastChecked: recipient.lastChecked });
        }
    }
    catch (error) {
        logger_1.default.error('Failed to check recipients', { error });
    }
};
exports.checkRecipients = checkRecipients;
const getHighLevelStats = async () => {
    const recipients = await (0, exports.getRecipients)();
    return {
        totalRecipients: recipients.length,
        totalRecipientsWithLocker: recipients.filter(r => r.lockerAddress).length,
        totalRecipientsWithClaim: recipients.filter(r => r.claimed).length
    };
};
exports.getHighLevelStats = getHighLevelStats;
/**
 * Check how many recipients have been topped up in a given time period
 * @param timePeriod - The time period in seconds
 */
const latestRecipients = (timePeriod) => {
    const recipients = (0, exports.getStoredRecipients)();
    const recipientsToCheck = recipients.filter(r => (new Date(r.topUpDate)).getTime() > (new Date()).getTime() - timePeriod * 1000);
    return recipientsToCheck;
};
exports.latestRecipients = latestRecipients;
//# sourceMappingURL=UBARecipients.js.map