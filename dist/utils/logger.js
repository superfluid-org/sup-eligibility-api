"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const webhook_1 = require("@slack/webhook");
const config_1 = __importDefault(require("../config"));
const axios_1 = __importDefault(require("axios"));
// Create Slack webhook instance if URL is provided
const slackWebhook = config_1.default.slackWebhookUrl
    ? new webhook_1.IncomingWebhook(config_1.default.slackWebhookUrl)
    : null;
// Create Winston logger
const logger = winston_1.default.createLogger({
    level: config_1.default.nodeEnv === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'superfluid-eligibility-api' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'combined.log' }),
    ],
});
logger.slackNotify = async (message, level = 'info') => {
    // Log with Winston
    logger.log(level, message);
    // Send to Slack if webhook is configured
    if (slackWebhook) {
        try {
            await slackWebhook.send({
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: message
                        }
                    }
                ],
            });
        }
        catch (error) {
            logger.error('Failed to send message to Slack', { error });
        }
    }
};
logger.discordNotify = async (message, level = 'info') => {
    // Log with Winston
    logger.log(level, message);
    // Send to Discord if webhook is configured
    if (process.env.DISCORD_WEBHOOK_LOGS_CHANNEL) {
        try {
            await axios_1.default.post(process.env.DISCORD_WEBHOOK_LOGS_CHANNEL, {
                content: message
            });
        }
        catch (error) {
            logger.error('Failed to send message to Discord', { error });
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map