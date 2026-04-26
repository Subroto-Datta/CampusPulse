const { Router } = require('express');
const { isMock, getItem } = require('../../config/db');
const ApiResponse = require('../../utils/apiResponse');

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    if (isMock()) {
      dbStatus = 'mock (in-memory)';
    } else {
      // Lightweight DynamoDB connectivity check using a data-plane operation
      await getItem('Users', { userId: 'health-check-ping' });
      dbStatus = 'connected (DynamoDB)';
    }
  } catch (err) {
    console.error('[Health Check] DynamoDB connectivity failed:', err.message);
  }

  return ApiResponse.success(res, {
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
