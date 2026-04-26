const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, updateItem, queryItems, isMock } = require('../../config/db');
const AppError = require('../../utils/AppError');

function getMock() { return require('../../config/mockDb'); }

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function generateQrToken(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 45_000);

  if (isMock()) {
    const mock = getMock();
    const student = mock.store.students.find(s => s.user_id === userId);
    if (!student) throw new AppError('Student record not found', 404);
    mock.store.qr_tokens.push({ id: mock.uuid(), student_id: student.id, token: hashedToken, is_used: false, expires_at: expiresAt.toISOString(), used_at: null });
    return { token: rawToken, expires_at: expiresAt, gr_number: student.gr_number };
  }

  // Look up student by user_id
  const students = await queryItems('Students', {
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });
  if (!students.length) throw new AppError('Student record not found', 404);
  const student = students[0];

  const tokenId = uuidv4();
  await putItem('QrTokens', {
    tokenId,
    student_id: student.studentId,
    token: hashedToken,
    is_used: false,
    expires_at: expiresAt.toISOString(),
    used_at: null,
    created_at: new Date().toISOString(),
  });

  return { token: rawToken, expires_at: expiresAt, gr_number: student.gr_number };
}

async function validateQrToken(token) {
  const hashedToken = hashToken(token);

  if (isMock()) {
    const mock = getMock();
    const qr = mock.store.qr_tokens.find(q => q.token === hashedToken);
    if (!qr) throw new AppError('Invalid QR code', 400);
    if (qr.is_used) throw new AppError('QR code already used', 400);
    if (new Date() > new Date(qr.expires_at)) throw new AppError('QR code has expired', 400);
    qr.is_used = true;
    qr.used_at = new Date().toISOString();
    const student = mock.getStudent(qr.student_id);
    const user = mock.getUser(student.user_id);
    const log = { id: mock.uuid(), student_id: qr.student_id, source: 'QR', scanned_at: new Date().toISOString(), gate_name: 'MAIN' };
    mock.store.gate_logs.push(log);
    return { gate_log_id: log.id, student_name: user.full_name, gr_number: student.gr_number, source: 'QR', scanned_at: log.scanned_at };
  }

  // Look up QR token via GSI
  const tokens = await queryItems('QrTokens', {
    IndexName: 'TokenIndex',
    KeyConditionExpression: '#tkn = :hash',
    ExpressionAttributeNames: { '#tkn': 'token' },
    ExpressionAttributeValues: { ':hash': hashedToken },
    Limit: 1,
  });
  if (!tokens.length) throw new AppError('Invalid QR code', 400);
  const qr = tokens[0];
  if (qr.is_used) throw new AppError('QR code already used', 400);
  if (new Date() > new Date(qr.expires_at)) throw new AppError('QR code has expired', 400);

  // Mark token as used
  await updateItem('QrTokens', { tokenId: qr.tokenId },
    'SET is_used = :used, used_at = :now',
    { ':used': true, ':now': new Date().toISOString() }
  );

  // Look up student and user
  const student = qr.student_id ? await getItem('Students', { studentId: qr.student_id }) : null;
  const user = (student && student.user_id) ? await getItem('Users', { userId: student.user_id }) : null;

  // Create gate log
  const logId = uuidv4();
  const now = new Date().toISOString();
  await putItem('GateLogs', {
    logId,
    student_id: qr.student_id,
    source: 'QR',
    scanned_at: now,
    scan_date: now.slice(0, 10),   // required for DateIndex GSI
    gate_name: 'MAIN',
    raw_payload: { token_hash: hashedToken.substring(0, 16) + '...' },
    created_at: now,
  });

  return { 
    gate_log_id: logId, 
    student_name: user?.full_name || 'Unknown Student', 
    gr_number: student?.gr_number || 'N/A', 
    source: 'QR', 
    scanned_at: now 
  };
}

module.exports = { generateQrToken, validateQrToken };
