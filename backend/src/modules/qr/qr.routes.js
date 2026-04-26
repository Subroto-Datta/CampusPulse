const { Router } = require('express');
const ctrl = require('./qr.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const router = Router();

// Student generates QR token
router.get('/generate', authenticate, authorize('student'), ctrl.generate);

// Guard validates QR token
router.post('/validate', authenticate, authorize('guard', 'admin'), validate(['token']), ctrl.validate);

module.exports = router;
