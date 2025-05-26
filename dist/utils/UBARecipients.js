"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestRecipients = exports.getHighLevelStats = exports.getRecipient = exports.updateRecipient = exports.addRecipient = exports.getRecipients = exports.getStoredRecipients = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
// Path to the data file
const DATA_FILE_PATH = path_1.default.join(__dirname, '../../data/UniversalPointRecipients.json');
// Ensure the data directory exists
const dataDir = path_1.default.dirname(DATA_FILE_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
/**
 * Get stored recipients from the data file
 * @returns Array of recipients
 */
const getStoredRecipients = () => {
    try {
        if (!fs_1.default.existsSync(DATA_FILE_PATH)) {
            // If file doesn't exist, create it with empty array
            fs_1.default.writeFileSync(DATA_FILE_PATH, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs_1.default.readFileSync(DATA_FILE_PATH, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        logger_1.default.error('Failed to read recipients data', { error });
        return [];
    }
};
exports.getStoredRecipients = getStoredRecipients;
/**
 * Get recipients data, optionally with cache control
 * @param cache Whether to use cached data (default: true)
 * @returns Promise with recipients data
 */
const getRecipients = async (cache) => {
    // TODO: Implement cache logic if needed
    return (0, exports.getStoredRecipients)();
};
exports.getRecipients = getRecipients;
/**
 * Save recipients data to file
 * @param recipients Array of recipients to save
 * @returns Boolean indicating success
 */
const saveRecipients = (recipients) => {
    try {
        fs_1.default.writeFileSync(DATA_FILE_PATH, JSON.stringify(recipients, null, 2));
        return true;
    }
    catch (error) {
        logger_1.default.error('Failed to save recipients data', { error });
        return false;
    }
};
/**
 * Add a new recipient to the data file
 * @param recipient Recipient data to add
 * @returns Boolean indicating success
 */
const addRecipient = (recipient) => {
    if (!recipient.address) {
        logger_1.default.error('Attempted to add recipient without address');
        return false;
    }
    try {
        const recipients = (0, exports.getStoredRecipients)();
        const now = new Date().toISOString();
        // Check if recipient already exists
        const existingIndex = recipients.findIndex(r => r.address.toLowerCase() === recipient.address.toLowerCase());
        if (existingIndex >= 0) {
            // Update existing recipient
            recipients[existingIndex] = {
                ...recipients[existingIndex],
                ...recipient,
                topUpDate: now,
            };
        }
        else {
            // Add new recipient
            recipients.push({
                address: recipient.address,
                topUpDate: now,
                ...recipient,
            });
        }
        return saveRecipients(recipients);
    }
    catch (error) {
        logger_1.default.error('Failed to add recipient', { error, recipient });
        return false;
    }
};
exports.addRecipient = addRecipient;
/**
 * Update an existing recipient
 * @param address Address of the recipient to update
 * @param updates Updates to apply
 * @returns Boolean indicating success
 */
const updateRecipient = (address, updates) => {
    try {
        const recipients = (0, exports.getStoredRecipients)();
        const recipientIndex = recipients.findIndex(r => r.address.toLowerCase() === address.toLowerCase());
        if (recipientIndex === -1) {
            logger_1.default.warn(`Attempted to update non-existent recipient: ${address}`);
            return false;
        }
        recipients[recipientIndex] = {
            ...recipients[recipientIndex],
            ...updates,
        };
        return saveRecipients(recipients);
    }
    catch (error) {
        logger_1.default.error('Failed to update recipient', { error, address, updates });
        return false;
    }
};
exports.updateRecipient = updateRecipient;
/**
 * Get a recipient by address
 * @param address Ethereum address
 * @returns Recipient data or null if not found
 */
const getRecipient = (address) => {
    try {
        const recipients = (0, exports.getStoredRecipients)();
        return recipients.find(r => r.address.toLowerCase() === address.toLowerCase()) || null;
    }
    catch (error) {
        logger_1.default.error('Failed to get recipient', { error, address });
        return null;
    }
};
exports.getRecipient = getRecipient;
/**
 * Get high-level statistics about recipients
 * @returns Promise with statistics
 */
const getHighLevelStats = async () => {
    const recipients = await (0, exports.getRecipients)();
    return {
        totalRecipients: recipients.length,
        totalRecipientsWithClaim: recipients.filter(r => r.claimed).length,
    };
};
exports.getHighLevelStats = getHighLevelStats;
/**
 * Get recipients that were topped up within the specified time period
 * @param timePeriod Time period in seconds
 * @returns Array of recipients
 */
const latestRecipients = (timePeriod) => {
    const recipients = (0, exports.getStoredRecipients)();
    const now = new Date();
    const cutoff = new Date(now.getTime() - timePeriod * 1000);
    return recipients.filter(recipient => {
        const topUpDate = new Date(recipient.topUpDate);
        return topUpDate >= cutoff;
    });
};
exports.latestRecipients = latestRecipients;
//# sourceMappingURL=UBARecipients.js.map