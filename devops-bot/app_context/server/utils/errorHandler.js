const logger = require('./logger');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log the error
  logger.error(`[${statusCode}] ${err.message}`);
  if (err.stack) {
    logger.error(err.stack);
  }
  
  // Respond to client
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = errorHandler;