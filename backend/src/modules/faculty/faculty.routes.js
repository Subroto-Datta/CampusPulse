const { Router } = require('express');
const ctrl = require('./faculty.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const router = Router();

router.get('/today-sessions', authenticate, authorize('faculty'), ctrl.todaySessions);
router.get('/session/:id/students', authenticate, authorize('faculty', 'admin'), ctrl.sessionStudents);
router.post('/attendance/submit', authenticate, authorize('faculty'), validate(['session_id']), ctrl.submitAttendance);

// CRUD routes
router.get('/', authenticate, authorize('admin'), ctrl.list);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
