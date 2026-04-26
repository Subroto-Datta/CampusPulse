const qrService = require('./qr.service');
const ApiResponse = require('../../utils/apiResponse');

async function generate(req, res, next) {
  try {
    const data = await qrService.generateQrToken(req.user.id);
    return ApiResponse.success(res, data, 'QR token generated');
  } catch (err) { next(err); }
}

async function validate(req, res, next) {
  try {
    const data = await qrService.validateQrToken(req.body.token);
    return ApiResponse.success(res, data, 'Entry validated');
  } catch (err) { next(err); }
}

module.exports = { generate, validate };
