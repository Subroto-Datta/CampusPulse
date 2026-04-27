const adminService = require('./admin.service');
const ApiResponse = require('../../utils/apiResponse');

async function dashboardStats(req, res, next) {
  try {
    const data = await adminService.getDashboardStats();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function gateLogs(req, res, next) {
  try {
    const data = await adminService.getGateLogs(req.query);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function mapRfid(req, res, next) {
  try {
    const data = await adminService.mapRfid(req.body);
    return ApiResponse.created(res, data, 'RFID mapped');
  } catch (err) { next(err); }
}

async function getRfidMappings(req, res, next) {
  try {
    const data = await adminService.getRfidMappings();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function revokeRfid(req, res, next) {
  try {
    const data = await adminService.revokeRfid(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function listSessions(req, res, next) {
  try {
    const data = await adminService.listSessions();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function createSession(req, res, next) {
  try {
    const data = await adminService.createSession(req.body);
    return ApiResponse.created(res, data, 'Session created');
  } catch (err) { next(err); }
}

async function updateSession(req, res, next) {
  try {
    const data = await adminService.updateSession(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Session updated');
  } catch (err) { next(err); }
}

async function deleteSession(req, res, next) {
  try {
    await adminService.deleteSession(req.params.id);
    return ApiResponse.success(res, null, 'Session deleted');
  } catch (err) { next(err); }
}

async function listCourses(req, res, next) {
  try {
    const data = await adminService.listCourses();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function createCourse(req, res, next) {
  try {
    const data = await adminService.createCourse(req.body);
    return ApiResponse.created(res, data, 'Course created');
  } catch (err) { next(err); }
}

async function updateCourse(req, res, next) {
  try {
    const data = await adminService.updateCourse(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Course updated');
  } catch (err) { next(err); }
}

async function deleteCourse(req, res, next) {
  try {
    await adminService.deleteCourse(req.params.id);
    return ApiResponse.success(res, null, 'Course deleted');
  } catch (err) { next(err); }
}

module.exports = { 
  dashboardStats, gateLogs, mapRfid, getRfidMappings, revokeRfid, 
  listSessions, createSession, updateSession, deleteSession, 
  listCourses, createCourse, updateCourse, deleteCourse 
};


