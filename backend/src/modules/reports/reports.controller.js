const reportsService = require('./reports.service');
const ApiResponse = require('../../utils/apiResponse');

async function dailyTrend(req, res, next) {
  try {
    const data = await reportsService.dailyAttendanceTrend(req.query.days || 30);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function subjectWise(req, res, next) {
  try {
    const data = await reportsService.subjectWiseAttendance();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function lowAttendance(req, res, next) {
  try {
    const data = await reportsService.lowAttendanceStudents();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function bunkSuspects(req, res, next) {
  try {
    const data = await reportsService.bunkSuspects(req.query.days || 7);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function lateArrivals(req, res, next) {
  try {
    const data = await reportsService.lateArrivals(req.query.days || 7);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

module.exports = { dailyTrend, subjectWise, lowAttendance, bunkSuspects, lateArrivals };
