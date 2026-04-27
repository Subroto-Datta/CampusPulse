const attendanceService = require('./attendance.service');
const ApiResponse = require('../../utils/apiResponse');

async function resolveSession(req, res, next) {
  try {
    const data = await attendanceService.resolveSession(req.params.sessionId);
    return ApiResponse.success(res, data, 'Attendance resolved');
  } catch (err) { next(err); }
}

async function getAlerts(req, res, next) {
  try {
    const data = await attendanceService.getAlerts(req.query);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function uploadAttendance(req, res, next) {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }
    const data = await attendanceService.processAttendanceFile(req.params.sessionId, req.file.buffer, req.file.mimetype, req.user.id);
    return ApiResponse.success(res, data, 'Attendance processing complete');
  } catch (err) { next(err); }
}

module.exports = { resolveSession, getAlerts, uploadAttendance };

