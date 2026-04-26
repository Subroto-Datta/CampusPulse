const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Verify JWT and attach user payload to req.user.
 */
const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired — please log in again', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

/**
 * Role-based authorization guard.
 * @param  {...string} roles — allowed roles
 */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }
  next();
};

module.exports = { authenticate, authorize };
