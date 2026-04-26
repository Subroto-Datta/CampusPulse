const env = require('../config/env');

/**
 * Centralized error-handling middleware.
 * Must be registered last (after all routes).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (env.nodeEnv === 'development') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
