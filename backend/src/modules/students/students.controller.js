const studentsService = require('./students.service');
const ApiResponse = require('../../utils/apiResponse');

async function list(req, res, next) {
  try {
    const data = await studentsService.listStudents(req.query);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const data = await studentsService.getStudentDetail(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await studentsService.createStudent(req.body);
    return ApiResponse.created(res, data, 'Student created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await studentsService.updateStudent(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Student updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await studentsService.deleteStudent(req.params.id);
    return ApiResponse.success(res, null, 'Student deleted');
  } catch (err) { next(err); }
}

module.exports = { list, detail, create, update, remove };
