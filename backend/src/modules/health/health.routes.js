const { Router } = require('express');
const { tableName, isMock, docClient } = require('../../config/db');
const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const ApiResponse = require('../../utils/apiResponse');

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    if (isMock()) {
      dbStatus = 'mock (in-memory)';
    } else if (docClient) {
      // Lightweight DynamoDB connectivity check via DescribeTable
      await docClient.config.client.send(
        new DescribeTableCommand({ TableName: tableName('Users') })
      );
      dbStatus = 'connected (DynamoDB)';
    }
  } catch (_) { /* connectivity check failed — report disconnected */ }

  return ApiResponse.success(res, {
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
