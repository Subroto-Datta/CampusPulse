const { Router } = require('express');
const ctrl = require('./admin.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const router = Router();

router.get('/dashboard', authenticate, authorize('admin'), ctrl.dashboardStats);
router.get('/gate-logs', authenticate, authorize('admin', 'guard'), ctrl.gateLogs);
router.post('/rfid/map', authenticate, authorize('admin'), validate(['rfid_uid', 'student_id']), ctrl.mapRfid);
router.get('/rfid/mappings', authenticate, authorize('admin'), ctrl.getRfidMappings);
router.patch('/rfid/:id/revoke', authenticate, authorize('admin'), ctrl.revokeRfid);

router.get('/sessions', authenticate, authorize('admin'), ctrl.listSessions);
router.post('/sessions', authenticate, authorize('admin'), ctrl.createSession);
router.put('/sessions/:id', authenticate, authorize('admin'), ctrl.updateSession);
router.delete('/sessions/:id', authenticate, authorize('admin'), ctrl.deleteSession);

module.exports = router;
