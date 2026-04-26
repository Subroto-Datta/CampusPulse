const authService = require('./auth.service');
const ApiResponse = require('../../utils/apiResponse');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body);
    return ApiResponse.created(res, data, 'User registered');
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    return ApiResponse.success(res, data, 'Login successful');
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const data = await authService.me(req.user.id);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

module.exports = { register, login, me };
