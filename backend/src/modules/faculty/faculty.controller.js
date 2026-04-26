const facultyService = require('./faculty.service');
const ApiResponse = require('../../utils/apiResponse');

async function todaySessions(req, res, next) {
  try {
    const data = await facultyService.getTodaySessions(req.user.id);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function sessionStudents(req, res, next) {
  try {
    const data = await facultyService.getSessionStudents(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function submitAttendance(req, res, next) {
  try {
    const { session_id, absent_student_ids } = req.body;
    const data = await facultyService.submitAttendance(session_id, absent_student_ids, req.user.id);
    return ApiResponse.success(res, data, 'Attendance submitted');
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const data = await facultyService.listFaculties();
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await facultyService.createFaculty(req.body);
    return ApiResponse.created(res, data, 'Faculty created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await facultyService.updateFaculty(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Faculty updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await facultyService.deleteFaculty(req.params.id);
    return ApiResponse.success(res, null, 'Faculty deleted');
  } catch (err) { next(err); }
}

module.exports = { todaySessions, sessionStudents, submitAttendance, list, create, update, remove };
