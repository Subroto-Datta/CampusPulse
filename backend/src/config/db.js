/**
 * DynamoDB database client for CampusPulse.
 * Replaces the previous PostgreSQL (pg) pool.
 *
 * Exports helper functions that mirror common DynamoDB DocumentClient
 * operations so service files stay clean.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
} = require('@aws-sdk/lib-dynamodb');
const env = require('./env');

const USE_MOCK = process.env.DB_MOCK === 'true';

// ─── DynamoDB client setup ─────────────────────────────────
let docClient = null;

if (!USE_MOCK) {
  const client = new DynamoDBClient({
    region: env.aws.region,
    ...(env.aws.endpoint ? { endpoint: env.aws.endpoint } : {}),
  });
  docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}

// ─── Table name helper ────────────────────────────────────
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'CampusPulse_';

function tableName(base) {
  return `${TABLE_PREFIX}${base}`;
}

// ─── DynamoDB helper wrappers ─────────────────────────────

async function getItem(table, key) {
  const result = await docClient.send(new GetCommand({ TableName: tableName(table), Key: key }));
  return result.Item || null;
}

async function putItem(table, item) {
  await docClient.send(new PutCommand({ TableName: tableName(table), Item: item }));
  return item;
}

async function updateItem(table, key, updateExpression, expressionValues, expressionNames) {
  const params = {
    TableName: tableName(table),
    Key: key,
    UpdateExpression: updateExpression,
    ReturnValues: 'ALL_NEW',
  };
  if (expressionValues) params.ExpressionAttributeValues = expressionValues;
  if (expressionNames) params.ExpressionAttributeNames = expressionNames;
  const result = await docClient.send(new UpdateCommand(params));
  return result.Attributes;
}

async function deleteItem(table, key) {
  const result = await docClient.send(new DeleteCommand({
    TableName: tableName(table),
    Key: key,
    ReturnValues: 'ALL_OLD',
  }));
  return result.Attributes || null;
}

async function queryItems(table, params) {
  const result = await docClient.send(new QueryCommand({
    TableName: tableName(table),
    ...params,
  }));
  return result.Items || [];
}

async function scanItems(table, params = {}) {
  const allItems = [];
  let lastKey = undefined;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: tableName(table),
      ExclusiveStartKey: lastKey,
      ...params,
    }));
    allItems.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return allItems;
}

async function batchWrite(table, items) {
  // DynamoDB batch write supports max 25 items at a time
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }
  for (const batch of batches) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [tableName(table)]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }));
  }
}

async function batchGet(table, keys) {
  const allItems = [];
  const batches = [];
  for (let i = 0; i < keys.length; i += 100) {
    batches.push(keys.slice(i, i + 100));
  }
  for (const batch of batches) {
    const result = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [tableName(table)]: { Keys: batch },
      },
    }));
    allItems.push(...(result.Responses[tableName(table)] || []));
  }
  return allItems;
}

function isMock() { return USE_MOCK; }

module.exports = {
  docClient,
  tableName,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
  batchWrite,
  batchGet,
  isMock,
};
