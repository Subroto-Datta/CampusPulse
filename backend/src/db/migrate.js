/**
 * Create DynamoDB tables for CampusPulse.
 * Usage: npm run migrate
 *
 * This replaces SQL migrations. It creates tables and GSIs
 * in DynamoDB. Safe to re-run — it skips existing tables.
 */
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
});

const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'CampusPulse_';

// ─── Table Definitions ────────────────────────────────────
const tables = [
  {
    TableName: `${PREFIX}Users`,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'role', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'RoleIndex',
        KeySchema: [{ AttributeName: 'role', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Students`,
    KeySchema: [{ AttributeName: 'studentId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'studentId', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'gr_number', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GrNumberIndex',
        KeySchema: [{ AttributeName: 'gr_number', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Faculty`,
    KeySchema: [{ AttributeName: 'facultyId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'facultyId', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Departments`,
    KeySchema: [{ AttributeName: 'departmentId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'departmentId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Courses`,
    KeySchema: [{ AttributeName: 'courseId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'courseId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Enrollments`,
    KeySchema: [
      { AttributeName: 'student_id', KeyType: 'HASH' },
      { AttributeName: 'course_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'student_id', AttributeType: 'S' },
      { AttributeName: 'course_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CourseIndex',
        KeySchema: [{ AttributeName: 'course_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}RfidCards`,
    KeySchema: [{ AttributeName: 'cardId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'cardId', AttributeType: 'S' },
      { AttributeName: 'rfid_uid', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'RfidUidIndex',
        KeySchema: [{ AttributeName: 'rfid_uid', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}GateLogs`,
    KeySchema: [{ AttributeName: 'logId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'logId', AttributeType: 'S' },
      { AttributeName: 'student_id', AttributeType: 'S' },
      { AttributeName: 'scanned_at', AttributeType: 'S' },
      { AttributeName: 'scan_date', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'StudentTimeIndex',
        KeySchema: [
          { AttributeName: 'student_id', KeyType: 'HASH' },
          { AttributeName: 'scanned_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'DateIndex',
        KeySchema: [
          { AttributeName: 'scan_date', KeyType: 'HASH' },
          { AttributeName: 'scanned_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}LectureSessions`,
    KeySchema: [{ AttributeName: 'sessionId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'sessionId', AttributeType: 'S' },
      { AttributeName: 'session_date', AttributeType: 'S' },
      { AttributeName: 'course_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'DateIndex',
        KeySchema: [{ AttributeName: 'session_date', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'CourseIndex',
        KeySchema: [{ AttributeName: 'course_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}AttendanceRecords`,
    KeySchema: [
      { AttributeName: 'session_id', KeyType: 'HASH' },
      { AttributeName: 'student_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'session_id', AttributeType: 'S' },
      { AttributeName: 'student_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'StudentIndex',
        KeySchema: [{ AttributeName: 'student_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}QrTokens`,
    KeySchema: [{ AttributeName: 'tokenId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'tokenId', AttributeType: 'S' },
      { AttributeName: 'token', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TokenIndex',
        KeySchema: [{ AttributeName: 'token', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}Alerts`,
    KeySchema: [{ AttributeName: 'alertId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'alertId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: `${PREFIX}AuditLogs`,
    KeySchema: [{ AttributeName: 'logId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'logId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false;
    throw e;
  }
}

async function migrate() {
  console.log(`\n📦 Creating ${tables.length} DynamoDB table(s)...\n`);

  for (const tableDef of tables) {
    const exists = await tableExists(tableDef.TableName);
    if (exists) {
      console.log(`  ✔ ${tableDef.TableName} (already exists)`);
      continue;
    }
    console.log(`  → Creating ${tableDef.TableName}...`);
    await client.send(new CreateTableCommand(tableDef));
    // Wait until table is active
    await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: tableDef.TableName });
    console.log(`  ✔ ${tableDef.TableName} (created)`);
  }

  console.log('\n✅ DynamoDB migration complete.\n');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
