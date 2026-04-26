const entryService = require('./entry.service');
const ApiResponse = require('../../utils/apiResponse');

async function rfidEntry(req, res, next) {
  try {
    const data = await entryService.processRfidEntry(req.body);
    return ApiResponse.success(res, data, 'Gate entry logged');
  } catch (err) { next(err); }
}

module.exports = { rfidEntry };
