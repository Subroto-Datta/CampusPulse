const AppError = require('../utils/AppError');

/**
 * Request-body validator middleware factory.
 * @param {string[]} requiredFields — fields that must be present and non-empty.
 */
const validate = (requiredFields = []) => (req, _res, next) => {
  const missing = requiredFields.filter(
    (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
  );
  if (missing.length) {
    return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
  }
  next();
};

module.exports = validate;
