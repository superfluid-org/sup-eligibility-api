"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json());
// Create logger
const logger = winston_1.default.createLogger({
    level: config_1.default.nodeEnv === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // Write logs to console
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }), winston_1.default.format.printf(info => {
                const { timestamp, level, message, ...rest } = info;
                return `${timestamp} ${level}: ${message} ${Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''}`;
            }))
        }),
        // Write all logs to combined.log, all error logs to error.log
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' })
    ],
    // Don't exit on uncaught exceptions
    exitOnError: false
});
// Add Slack notification function
logger.slackNotify = async (message, level = 'info') => {
    // Skip notifications in development mode unless it's an error
    if (config_1.default.nodeEnv !== 'production' && level !== 'error') {
        logger.debug(`[SLACK NOTIFICATION SKIPPED IN DEV] ${message}`);
        return;
    }
    // Skip if webhook URL is not configured
    if (!config_1.default.slackWebhookUrl) {
        logger.debug('Slack webhook URL not configured, skipping notification');
        return;
    }
    try {
        // Set icon and color based on log level
        const emoji = level === 'error' ? ':x:' : level === 'warn' ? ':warning:' : ':information_source:';
        const color = level === 'error' ? '#FF0000' : level === 'warn' ? '#FFA500' : '#0000FF';
        const env = config_1.default.nodeEnv === 'production' ? 'PROD' : 'DEV';
        await axios_1.default.post(config_1.default.slackWebhookUrl, {
            attachments: [
                {
                    color,
                    text: `${emoji} [${env}] ${message}`,
                    footer: `Eligibility API ${new Date().toISOString()}`
                }
            ]
        });
    }
    catch (error) {
        logger.error('Failed to send Slack notification', { error });
    }
};
// Add Discord notification function (placeholder for future implementation)
logger.discordNotify = async (message, level = 'info') => {
    // Placeholder - implement if Discord notifications are needed
    logger.debug(`[DISCORD NOTIFICATION] ${message}`);
};
exports.default = logger;
//# sourceMappingURL=logger.js.map