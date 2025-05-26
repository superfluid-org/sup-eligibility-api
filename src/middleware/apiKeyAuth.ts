import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiKey, loadApiKeys } from '../models/apiKey';
import path from 'path';
import fs from 'fs';

// Create a global map of API keys for validation
const API_KEYS = loadApiKeys();

/**
 * Middleware to validate API keys
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation in development if configured to do so
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_API_KEY_AUTH === 'true') {
    logger.warn('API key validation skipped in development mode', {
      path: req.path,
      ip: req.ip
    });
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API request missing API key', { 
      path: req.path,
      ip: req.ip
    });
    
    // Log security event
    logSecurityEvent('Missing API key', { 
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
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
    
    // Log security event
    logSecurityEvent('Invalid API key', { 
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      keyAttempt: `${(apiKey as string).substring(0, 4)}****`
    });
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      statusCode: 401
    });
  }
  
  // Check if key is active
  if (!keyData.active) {
    logger.warn('Inactive API key used', { 
      path: req.path,
      ip: req.ip,
      keyName: keyData.name
    });
    
    // Log security event
    logSecurityEvent('Inactive API key used', { 
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      keyName: keyData.name
    });
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is inactive',
      statusCode: 401
    });
  }
  
  // Log API key usage
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
  
  // Track API key usage (non-blocking)
  trackApiKeyUsage(keyData.name, req.path);
  
  next();
};

/**
 * Track API key usage for analytics
 * @param keyName Name of the API key
 * @param endpoint API endpoint accessed
 */
export const trackApiKeyUsage = (keyName: string, endpoint: string) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageFile = path.join(__dirname, '../../data/api-usage.json');
    const usageDir = path.dirname(usageFile);
    
    // Ensure the directory exists
    if (!fs.existsSync(usageDir)) {
      fs.mkdirSync(usageDir, { recursive: true });
    }
    
    // Create/read the usage file
    let usage: Record<string, any> = {};
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
    
    // Write updated data back to file (async)
    fs.writeFile(usageFile, JSON.stringify(usage, null, 2), (err) => {
      if (err) {
        logger.error('Error writing API usage data', { error: err });
      }
    });
  } catch (error) {
    logger.error('Error tracking API key usage', { error });
    // Non-critical operation, so we just log the error and continue
  }
};

/**
 * Log significant security events to Slack
 * @param event Security event description
 * @param details Additional event details
 */
export const logSecurityEvent = (event: string, details: Record<string, any>) => {
  logger.slackNotify(`Security Event: ${event}`, 'warn');
  logger.warn(`Security Event: ${event}`, details);
}; 