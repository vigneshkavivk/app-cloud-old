// server/middleware/errorHandler.js
import logger from './logger.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  logger.error(`[${statusCode}] ${err.message}`);
  if (err.stack) {
    logger.error(err.stack);
  }
  
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

export default errorHandler;