import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import eligibilityController from './controllers/eligibilityController';
import adminController from './controllers/adminController';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import config from './config';
import logger from './utils/logger';

require('dotenv').config();

// Create Express application
const app: Express = express();

// Apply middleware
app.use(helmet());
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(requestLogger); // Log requests

// Define routes

/**
 * Endpoint: GET /health
 * Description: Verifies if the API is functioning correctly
 * Controller: eligibilityController.healthCheck
 * Note: This endpoint is public for monitoring purposes
 */
app.get('/health', eligibilityController.healthCheck);

// Admin routes - protected by admin API key (checked in the controller)
app.get('/admin/keys', adminController.listApiKeys);
app.get('/admin/usage', adminController.getApiUsage);
app.post('/admin/keys/generate', adminController.generateApiKey);

// Apply API key authentication to all protected routes below
app.use(apiKeyAuth);

/**
 * Endpoint: GET /eligibility
 * Description: Checks eligibility status
 * Controller: eligibilityController.checkEligibility
 * Authentication: API key required
 */
app.get('/eligibility', eligibilityController.checkEligibility);

/**
 * Endpoint: GET /point-systems
 * Description: Retrieves available point systems
 * Controller: eligibilityController.getPointSystems
 * Authentication: API key required
 */
app.get('/point-systems', eligibilityController.getPointSystems);

/**
 * Endpoint: GET /stack-activity
 * Description: Retrieves activity data from Stack protocol for a given address
 * Query Parameters:
 *   - address (required): String - Ethereum address to query
 *   - point-system-id (optional): Number - Specific point system ID to filter results
 * Authentication: API key required
 */
app.get('/stack-activity', async (req: express.Request, res: express.Response) => {
  const address = req.query.address as string;
  // check if address is valid
  if (!address || !/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: 'Invalid address' });
    return;
  }

  const pointSystemId = req.query['point-system-id'] ? Number(req.query['point-system-id']) : undefined;
  
  try {
    const stackApiService = (await import('./services/stack/stackApiService')).default;
    
    if (!pointSystemId) {
      const stackActivity = await stackApiService.getStackActivityForAllPointSystems(address);
      res.json(stackActivity);
    } else {
      const stackActivity = await stackApiService.getStackActivity(address, pointSystemId);
      res.json(stackActivity);
    }
  } catch (error) {
    logger.error('Error fetching stack activity', { error });
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      statusCode: 500
    });
  }
});

// Handle 404 errors
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
});

// Apply error handler
app.use(errorHandler);

// Start the server
const PORT = config.port;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Eligibility API started on port ${PORT}`);
    logger.slackNotify(`Eligibility API server started on port ${PORT}`, 'info');
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection', { error: reason.stack });
  logger.slackNotify(`Unhandled Promise Rejection: ${reason.message}`, 'error');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.stack });
  logger.slackNotify(`Uncaught Exception: ${error.message}`, 'error');
  
  // Exit with error
  process.exit(1);
});

export default app; 