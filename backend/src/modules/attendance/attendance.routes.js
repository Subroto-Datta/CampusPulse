const { Router } = require('express');
const multer = require('multer');
const ctrl = require('./attendance.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/resolve/:sessionId', authenticate, authorize('admin', 'faculty'), ctrl.resolveSession);
router.get('/alerts', authenticate, authorize('admin', 'faculty'), ctrl.getAlerts);
router.post('/upload/:sessionId', authenticate, authorize('admin', 'faculty'), upload.single('document'), ctrl.uploadAttendance);


module.exports = router;
