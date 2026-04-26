const { Router } = require('express');
const ctrl = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = Router();

router.get('/daily-trend', authenticate, authorize('admin', 'faculty'), ctrl.dailyTrend);
router.get('/subject-wise', authenticate, authorize('admin', 'faculty'), ctrl.subjectWise);
router.get('/low-attendance', authenticate, authorize('admin', 'faculty'), ctrl.lowAttendance);
router.get('/bunk-suspects', authenticate, authorize('admin'), ctrl.bunkSuspects);
router.get('/late-arrivals', authenticate, authorize('admin', 'faculty'), ctrl.lateArrivals);

module.exports = router;
