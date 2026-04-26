const { Router } = require('express');
const ctrl = require('./students.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize('admin', 'faculty'), ctrl.list);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.get('/:id', authenticate, authorize('admin', 'faculty', 'student'), ctrl.detail);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
