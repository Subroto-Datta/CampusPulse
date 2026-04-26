/**
 * Dual Database System Client for CampusPulse.
 * Currently supports AWS DynamoDB and Supabase (PostgreSQL).
 * Switches based on DB_TYPE environment variable.
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
const supabase = require('./supabase');

const DB_TYPE = env.dbType || 'dynamodb';
const USE_MOCK = process.env.DB_MOCK === 'true';

// ─── DynamoDB setup ─────────────────────────────────────────
let docClient = null;
if (!USE_MOCK && DB_TYPE === 'dynamodb') {
  const client = new DynamoDBClient({
    region: env.aws.region,
    ...(env.aws.endpoint ? { endpoint: env.aws.endpoint } : {}),
  });
  docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
    unmarshallOptions: { wrapNumbers: false },
  });
}

// ─── Constants & Helpers ────────────────────────────────────
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'CampusPulse_';

function tableName(base) {
  if (DB_TYPE === 'supabase') return base.toLowerCase();
  return `${TABLE_PREFIX}${base}`;
}

// Map DynamoDB specific primary key names to standard 'id' for SQL
const KEY_MAPS = {
  'users': { 'userId': 'id' },
  'students': { 'studentId': 'id' },
  'departments': { 'departmentId': 'id' },
  'faculty': { 'facultyId': 'id' },
  'courses': { 'courseId': 'id' },
  'attendance_records': { 'attendanceId': 'id' },
  'lecture_sessions': { 'sessionId': 'id', 'id': 'id' },
};

function mapKeys(table, keyObj) {
  if (DB_TYPE !== 'supabase') return keyObj;
  const t = table.toLowerCase();
  const map = KEY_MAPS[t];
  if (!map) return keyObj;
  const newKey = {};
  for (const [k, v] of Object.entries(keyObj)) {
    newKey[map[k] || k] = v;
  }
  return newKey;
}

// ─── Database Operations ────────────────────────────────────

async function getItem(table, key) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const mappedKey = mapKeys(t, key);
    const { data, error } = await supabase.from(t).select('*').match(mappedKey).maybeSingle();
    if (error) {
      console.error(`Supabase getItem error [${t}]:`, error);
      return null;
    }
    return data;
  }
  const result = await docClient.send(new GetCommand({ TableName: tableName(table), Key: key }));
  return result.Item || null;
}

async function putItem(table, item) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    // Remove DynamoDB specific type markers if any
    const cleanItem = { ...item };
    // Map specific primary keys back to 'id' if they exist as separate props
    const map = KEY_MAPS[t];
    if (map) {
      for (const [dynamoKey, sqlKey] of Object.entries(map)) {
        if (cleanItem[dynamoKey] !== undefined) {
          cleanItem[sqlKey] = cleanItem[dynamoKey];
          // Keep both for compatibility during transition if needed, 
          // but we follow SQL schema which uses 'id'
        }
      }
    }
    const { data, error } = await supabase.from(t).upsert(cleanItem).select().single();
    if (error) {
      console.error(`Supabase putItem error [${t}]:`, error);
      throw error;
    }
    return data || item;
  }
  await docClient.send(new PutCommand({ TableName: tableName(table), Item: item }));
  return item;
}

async function updateItem(table, key, updateExpression, expressionValues, expressionNames = {}) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const mappedKey = mapKeys(t, key);
    const updateData = {};
    
    // Parse DynamoDB update expression: "SET #a = :x, b = :y"
    const parts = updateExpression.replace('SET ', '').split(',');
    for (const part of parts) {
      const [kPart, vPart] = part.split('=').map(s => s.trim());
      if (kPart && vPart) {
        const realKey = expressionNames[kPart] || kPart.replace('#', '');
        const realValue = expressionValues[vPart];
        if (realValue !== undefined) {
          updateData[realKey] = realValue;
        }
      }
    }
    
    const { data, error } = await supabase.from(t).update(updateData).match(mappedKey).select().single();
    if (error) {
      console.error(`Supabase updateItem error [${t}]:`, error);
      throw error;
    }
    return data;
  }
  
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
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const mappedKey = mapKeys(t, key);
    const { data, error } = await supabase.from(t).delete().match(mappedKey).select().single();
    if (error) {
      console.error(`Supabase deleteItem error [${t}]:`, error);
      return null;
    }
    return data;
  }
  const result = await docClient.send(new DeleteCommand({
    TableName: tableName(table),
    Key: key,
    ReturnValues: 'ALL_OLD',
  }));
  return result.Attributes || null;
}

async function queryItems(table, params) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    let query = supabase.from(t).select('*');
    
    // Naive mapping of common Query params
    if (params.IndexName && params.KeyConditionExpression) {
      // Example: "student_id = :sid"
      const [k, vPlaceholder] = params.KeyConditionExpression.split('=').map(s => s.trim());
      const realValue = params.ExpressionAttributeValues[vPlaceholder];
      query = query.eq(k, realValue);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Supabase queryItems error [${t}]:`, error);
      return [];
    }
    return data || [];
  }
  
  const result = await docClient.send(new QueryCommand({
    TableName: tableName(table),
    ...params,
  }));
  return result.Items || [];
}

async function scanItems(table, params = {}) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    let query = supabase.from(t).select('*');
    
    // Naive FilterExpression support
    if (params.FilterExpression && params.ExpressionAttributeValues) {
      const parts = params.FilterExpression.split('AND').map(p => p.trim());
      for (const part of parts) {
        const [k, vPlaceholder] = part.split('=').map(s => s.trim());
        const realValue = params.ExpressionAttributeValues[vPlaceholder];
        if (realValue !== undefined) {
          query = query.eq(k, realValue);
        }
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Supabase scanItems error [${t}]:`, error);
      return [];
    }
    return data || [];
  }

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
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const { error } = await supabase.from(t).upsert(items);
    if (error) throw error;
    return;
  }
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
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    // Map keys array
    const mappedKeys = keys.map(k => mapKeys(t, k));
    // Supabase doesn't have explicit batchGet by array of objects, but we can use 'in' if it's a single key
    // For simplicity, let's assume it's 'id' or we use OR logic
    // Actually, we can use filter
    const { data, error } = await supabase.from(t).select('*').in('id', mappedKeys.map(k => k.id));
    if (error) throw error;
    return data || [];
  }
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
