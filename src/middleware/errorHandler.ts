import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  logger.error('Error handling request', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Send error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    statusCode: 500
  });
}; 