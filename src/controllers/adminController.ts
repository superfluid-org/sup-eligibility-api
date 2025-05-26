import { Request, Response } from 'express';
import { loadApiKeys } from '../models/apiKey';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

class AdminController {
  /**
   * List all active API keys (with sensitive information masked)
   * Only accessible with the admin API key
   * @param req Express request
   * @param res Express response
   */
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      // Check for admin API key
      const adminKey = req.headers['x-admin-key'];
      
      if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin API key is required',
          statusCode: 401
        });
        return;
      }
      
      // Load API keys
      const apiKeys = loadApiKeys();
      
      // Mask sensitive information
      const maskedKeys = Array.from(apiKeys.entries()).map(([key, data]) => ({
        key: `************${key.substring(key.length - 4)}`,
        name: data.name,
        active: data.active,
      }));
      
      res.status(200).json({
        count: maskedKeys.length,
        keys: maskedKeys
      });
      
      logger.info('Admin listed API keys', {
        adminIp: req.ip,
        keyCount: maskedKeys.length
      });
    } catch (error) {
      logger.error('Error in admin list API keys endpoint', { error });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500
      });
    }
  }

  /**
   * Get API usage statistics
   * @param req Express request
   * @param res Express response
   */
  async getApiUsage(req: Request, res: Response): Promise<void> {
    try {
      // Check for admin API key
      const adminKey = req.headers['x-admin-key'];
      
      if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin API key is required',
          statusCode: 401
        });
        return;
      }
      
      // Get usage statistics from file
      const usageFile = path.join(__dirname, '../../data/api-usage.json');
      
      if (!fs.existsSync(usageFile)) {
        res.status(200).json({
          message: 'No API usage data available yet',
          usage: {}
        });
        return;
      }
      
      const fileContent = fs.readFileSync(usageFile, 'utf8');
      const usageData = JSON.parse(fileContent);
      
      // Process data to create a summary
      const summary = {
        totalRequests: 0,
        byClient: {} as Record<string, number>,
        byEndpoint: {} as Record<string, number>,
        byDay: {} as Record<string, number>
      };
      
      // Calculate statistics
      for (const day in usageData) {
        if (!summary.byDay[day]) {
          summary.byDay[day] = 0;
        }
        
        for (const client in usageData[day]) {
          if (!summary.byClient[client]) {
            summary.byClient[client] = 0;
          }
          
          for (const endpoint in usageData[day][client]) {
            if (!summary.byEndpoint[endpoint]) {
              summary.byEndpoint[endpoint] = 0;
            }
            
            const count = usageData[day][client][endpoint];
            summary.totalRequests += count;
            summary.byClient[client] += count;
            summary.byEndpoint[endpoint] += count;
            summary.byDay[day] += count;
          }
        }
      }
      
      res.status(200).json({
        message: 'API usage statistics retrieved successfully',
        usage: usageData,
        summary
      });
    } catch (error) {
      logger.error('Error in admin get API usage endpoint', { error });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500
      });
    }
  }

  /**
   * Generate a new API key (for testing purposes only)
   * This should typically be done via the generate-api-key.sh script
   * @param req Express request
   * @param res Express response
   */
  async generateApiKey(req: Request, res: Response): Promise<void> {
    try {
      // Check for admin API key
      const adminKey = req.headers['x-admin-key'];
      
      if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin API key is required',
          statusCode: 401
        });
        return;
      }
      
      // Get client name from request body
      const { clientName } = req.body;
      
      if (!clientName) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Client name is required',
          statusCode: 400
        });
        return;
      }
      
      // Generate a new API key using crypto
      const crypto = require('crypto');
      const newKey = crypto.randomBytes(16).toString('hex');
      
      res.status(200).json({
        message: 'New API key generated successfully',
        key: newKey,
        clientName,
        instructions: [
          'Add this key to your .env file:',
          `ELIGIBILITY_API_KEYS=<existing-keys>,${newKey}`,
          `ELIGIBILITY_API_KEY_NAMES=<existing-names>,${clientName}`,
          'Restart the API server for changes to take effect'
        ]
      });
      
      logger.slackNotify(`New API key generated for client: ${clientName}`, 'info');
    } catch (error) {
      logger.error('Error generating new API key', { error });
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500
      });
    }
  }
}

export default new AdminController(); 