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
console.log(`[Database] Active System: ${DB_TYPE.toUpperCase()}`);
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
  if (DB_TYPE === 'supabase') {
    // Convert CamelCase (QrTokens) to snake_case (qr_tokens)
    const translated = base.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    console.log(`[Database] Table Translated: ${base} -> ${translated}`);
    return translated;
  }
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
  'lecture_sessions': { 'sessionId': 'id' },
  'qr_tokens': { 'tokenId': 'id' },
  'gate_logs': { 'logId': 'id' },
  'audit_logs': { 'auditId': 'id' },
  'alerts': { 'alertId': 'id' },
  'rfid_cards': { 'cardId': 'id' },
  'enrollments': { 'enrollmentId': 'id' },
};

function mapKeys(table, keyObj) {
  if (DB_TYPE !== 'supabase' || !keyObj) return keyObj;
  const t = tableName(table);
  const map = KEY_MAPS[t];
  if (!map) return keyObj;
  const newKey = {};
  for (const [k, v] of Object.entries(keyObj)) {
    newKey[map[k] || k] = v;
  }
  return newKey;
}

/**
 * Maps SQL columns back to DynamoDB property names for output consistency.
 */
function reverseMap(table, item) {
  if (DB_TYPE !== 'supabase' || !item) return item;
  const t = table.toLowerCase();
  const map = KEY_MAPS[t];
  if (!map) return item;
  const newItem = { ...item };
  for (const [dynamoKey, sqlKey] of Object.entries(map)) {
    if (item[sqlKey] !== undefined) {
      newItem[dynamoKey] = item[sqlKey];
    }
  }
  return newItem;
}

// Valid columns for SQL tables (prevents 500 errors from extra DynamoDB fields)
const TABLE_COLUMNS = {
  'users': ['id', 'email', 'password_hash', 'role', 'full_name', 'phone', 'is_active', 'last_login', 'created_at', 'updated_at'],
  'students': ['id', 'user_id', 'gr_number', 'roll_number', 'division', 'semester', 'department_id', 'admission_year', 'created_at', 'updated_at'],
  'faculty': ['id', 'user_id', 'employee_id', 'department_id', 'designation', 'created_at', 'updated_at'],
  'departments': ['id', 'name', 'code', 'created_at', 'updated_at'],
  'courses': ['id', 'name', 'code', 'department_id', 'semester', 'credits', 'created_at', 'updated_at'],
  'enrollments': ['id', 'student_id', 'course_id', 'academic_year', 'created_at'],
  'gate_logs': ['id', 'student_id', 'source', 'scanned_at', 'gate_name', 'raw_payload', 'created_at'],
  'attendance_records': ['id', 'session_id', 'student_id', 'status', 'marked_by_faculty', 'gate_entry_id', 'late_flag', 'resolved_at', 'created_at', 'updated_at'],
  'lecture_sessions': ['id', 'course_id', 'faculty_id', 'division', 'session_date', 'start_time', 'end_time', 'is_completed', 'created_at', 'updated_at'],
  'qr_tokens': ['id', 'student_id', 'token', 'is_used', 'expires_at', 'used_at', 'created_at'],
  'audit_logs': ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'old_data', 'new_data', 'ip_address', 'created_at'],
  'alerts': ['id', 'student_id', 'alert_type', 'session_id', 'message', 'is_resolved', 'resolved_by', 'created_at', 'resolved_at'],
  'rfid_cards': ['id', 'rfid_uid', 'student_id', 'is_active', 'issued_at', 'revoked_at', 'created_at', 'updated_at'],
};

function filterSqlColumns(table, data) {
  const t = table.toLowerCase();
  const validCols = TABLE_COLUMNS[t];
  if (!validCols) return data;
  const filtered = {};
  for (const col of validCols) {
    if (data[col] !== undefined) filtered[col] = data[col];
  }
  return filtered;
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
    return reverseMap(t, data);
  }
  const result = await docClient.send(new GetCommand({ TableName: tableName(table), Key: key }));
  return result.Item || null;
}

async function putItem(table, item) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    let cleanItem = { ...item };
    const map = KEY_MAPS[t];
    if (map) {
      for (const [dynamoKey, sqlKey] of Object.entries(map)) {
        if (cleanItem[dynamoKey] !== undefined) {
          cleanItem[sqlKey] = cleanItem[dynamoKey];
          delete cleanItem[dynamoKey];
        }
      }
    }
    cleanItem = filterSqlColumns(t, cleanItem);

    console.log(`[Supabase Put] Table: ${t}, Payload:`, cleanItem);
    const { data, error } = await supabase.from(t).upsert(cleanItem).select().single();
    if (error) {
      console.error(`Supabase putItem error [${t}]:`, error);
      throw error;
    }
    return reverseMap(t, data || item);
  }
  await docClient.send(new PutCommand({ TableName: tableName(table), Item: item }));
  return item;
}

async function updateItem(table, key, updateExpression, expressionValues, expressionNames = {}) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const mappedKey = mapKeys(t, key);
    const updateData = {};
    
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
    
    const cleanUpdateData = filterSqlColumns(t, updateData);
    
    const { data, error } = await supabase.from(t).update(cleanUpdateData).match(mappedKey).select().single();
    if (error) {
      console.error(`Supabase updateItem error [${t}]:`, error);
      throw error;
    }
    return reverseMap(t, data);
  }
  
  const params = { TableName: tableName(table), Key: key, UpdateExpression: updateExpression, ReturnValues: 'ALL_NEW' };
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
    if (error) return null;
    return reverseMap(t, data);
  }
  const result = await docClient.send(new DeleteCommand({ TableName: tableName(table), Key: key, ReturnValues: 'ALL_OLD' }));
  return result.Attributes || null;
}

async function queryItems(table, params) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    let query = supabase.from(t).select('*');
    
    if (params.IndexName && params.KeyConditionExpression) {
      const condition = params.KeyConditionExpression;
      if (condition.includes('=')) {
        const [k, vPlaceholder] = condition.split('=').map(s => s.trim());
        const realKey = params.ExpressionAttributeNames?.[k] || k;
        const realValue = params.ExpressionAttributeValues[vPlaceholder];
        query = query.eq(realKey, realValue);
      }
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(item => reverseMap(t, item));
  }
  
  const result = await docClient.send(new QueryCommand({ TableName: tableName(table), ...params }));
  return result.Items || [];
}

async function scanItems(table, params = {}) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    let query = supabase.from(t).select('*');
    
    if (params.FilterExpression && params.ExpressionAttributeValues) {
      const parts = params.FilterExpression.split('AND').map(p => p.trim());
      for (const part of parts) {
        if (part.includes('=')) {
          const [k, vPlaceholder] = part.split('=').map(s => s.trim());
          const realKey = params.ExpressionAttributeNames?.[k] || k;
          const realValue = params.ExpressionAttributeValues[vPlaceholder];
          if (realValue !== undefined) query = query.eq(realKey, realValue);
        }
      }
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(item => reverseMap(t, item));
  }

  const allItems = [];
  let lastKey = undefined;
  do {
    const result = await docClient.send(new ScanCommand({ TableName: tableName(table), ExclusiveStartKey: lastKey, ...params }));
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
  for (let i = 0; i < items.length; i += 25) batches.push(items.slice(i, i + 25));
  for (const batch of batches) {
    await docClient.send(new BatchWriteCommand({ RequestItems: { [tableName(table)]: batch.map(item => ({ PutRequest: { Item: item } })) } }));
  }
}

async function batchGet(table, keys) {
  if (DB_TYPE === 'supabase') {
    const t = tableName(table);
    const mappedKeys = keys.map(k => mapKeys(t, k));
    const { data, error } = await supabase.from(t).select('*').in('id', mappedKeys.map(k => k.id));
    if (error) throw error;
    return (data || []).map(item => reverseMap(t, item));
  }
  const allItems = [];
  const batches = [];
  for (let i = 0; i < keys.length; i += 100) batches.push(keys.slice(i, i + 100));
  for (const batch of batches) {
    const result = await docClient.send(new BatchGetCommand({ RequestItems: { [tableName(table)]: { Keys: batch } } }));
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
