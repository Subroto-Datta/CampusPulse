const { Router } = require('express');
const ctrl = require('./auth.controller');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.post('/register', validate(['email', 'password', 'role', 'full_name']), ctrl.register);
router.post('/login', validate(['email', 'password']), ctrl.login);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
