import winston from 'winston';
import axios from 'axios';
import config from '../config';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => {
          const { timestamp, level, message, ...rest } = info;
          return `${timestamp} ${level}: ${message} ${
            Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''
          }`;
        })
      )
    }),
    // Write all logs to combined.log, all error logs to error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false
});

// Define extended logger type with notification methods
interface ExtendedLogger extends winston.Logger {
  slackNotify: (message: string, level?: string) => Promise<void>;
  discordNotify: (message: string, level?: string) => Promise<void>;
}

// Add Slack notification function
(logger as ExtendedLogger).slackNotify = async (message: string, level = 'info') => {
  // Skip notifications in development mode unless it's an error
  if (config.nodeEnv !== 'production' && level !== 'error') {
    logger.debug(`[SLACK NOTIFICATION SKIPPED IN DEV] ${message}`);
    return;
  }

  // Skip if webhook URL is not configured
  if (!config.slackWebhookUrl) {
    logger.debug('Slack webhook URL not configured, skipping notification');
    return;
  }

  try {
    // Set icon and color based on log level
    const emoji = level === 'error' ? ':x:' : level === 'warn' ? ':warning:' : ':information_source:';
    const color = level === 'error' ? '#FF0000' : level === 'warn' ? '#FFA500' : '#0000FF';
    
    const env = config.nodeEnv === 'production' ? 'PROD' : 'DEV';
    
    await axios.post(config.slackWebhookUrl, {
      attachments: [
        {
          color,
          text: `${emoji} [${env}] ${message}`,
          footer: `Eligibility API ${new Date().toISOString()}`
        }
      ]
    });
  } catch (error) {
    logger.error('Failed to send Slack notification', { error });
  }
};

// Add Discord notification function (placeholder for future implementation)
(logger as ExtendedLogger).discordNotify = async (message: string, level = 'info') => {
  // Placeholder - implement if Discord notifications are needed
  logger.debug(`[DISCORD NOTIFICATION] ${message}`);
};

export default logger as ExtendedLogger; 