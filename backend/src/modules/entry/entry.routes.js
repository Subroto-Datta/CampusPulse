const { Router } = require('express');
const ctrl = require('./entry.controller');
const validate = require('../../middleware/validate');

const router = Router();

// POST /api/entry/rfid — RFID gate scan
router.post('/rfid', validate(['rfid_uid']), ctrl.rfidEntry);

module.exports = router;
