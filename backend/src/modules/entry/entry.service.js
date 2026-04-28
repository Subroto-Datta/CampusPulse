const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, queryItems, isMock } = require('../../config/db');
const AppError = require('../../utils/AppError');

function getMock() { return require('../../config/mockDb'); }

async function processRfidEntry({ rfid_uid, timestamp }) {
  rfid_uid = (rfid_uid || '').trim().toUpperCase();
  const scanTime = timestamp ? new Date(timestamp) : new Date();

  if (isMock()) {
    const mock = getMock();
    const card = mock.store.rfid_cards.find(r => r.rfid_uid === rfid_uid);
    if (!card) throw new AppError('RFID card not registered', 404);
    if (!card.is_active) throw new AppError('RFID card is deactivated', 403);
    const fiveMinAgo = new Date(scanTime.getTime() - 5 * 60 * 1000);
    const dupe = mock.store.gate_logs.find(g => g.student_id === card.student_id && g.source === 'RFID' && new Date(g.scanned_at) > fiveMinAgo);
    if (dupe) throw new AppError('Duplicate scan — entry already logged within last 5 minutes', 429);
    const student = mock.getStudent(card.student_id);
    const user = mock.getUser(student.user_id);
    const log = { id: mock.uuid(), student_id: card.student_id, source: 'RFID', scanned_at: scanTime.toISOString(), gate_name: 'MAIN' };
    mock.store.gate_logs.push(log);
    return { gate_log_id: log.id, student_name: user.full_name, gr_number: student.gr_number, source: 'RFID', scanned_at: log.scanned_at };
  }

  // Look up RFID card via GSI
  const cards = await queryItems('RfidCards', {
    IndexName: 'RfidUidIndex',
    KeyConditionExpression: 'rfid_uid = :uid',
    ExpressionAttributeValues: { ':uid': rfid_uid },
    Limit: 1,
  });
  if (!cards.length) throw new AppError('RFID card not registered', 404);
  const card = cards[0];
  if (!card.is_active) throw new AppError('RFID card is deactivated', 403);

  // Look up student and user
  const student = card.student_id ? await getItem('Students', { studentId: card.student_id }) : null;
  const user = (student && student.user_id) ? await getItem('Users', { userId: student.user_id }) : null;

  // Duplicate check — look for gate logs from same student in last 5 minutes
  const fiveMinAgo = new Date(scanTime.getTime() - 5 * 60 * 1000).toISOString();
  const recentLogs = card.student_id ? await queryItems('GateLogs', {
    IndexName: 'StudentTimeIndex',
    KeyConditionExpression: 'student_id = :sid AND scanned_at > :since',
    FilterExpression: '#src = :rfid',
    ExpressionAttributeValues: { ':sid': card.student_id, ':since': fiveMinAgo, ':rfid': 'RFID' },
    ExpressionAttributeNames: { '#src': 'source' },
  }) : [];
  if (recentLogs.length) throw new AppError('Duplicate scan — entry already logged within last 5 minutes', 429);

  // Insert gate log
  const logId = uuidv4();
  const scannedAtISO = scanTime.toISOString();
  const gateLog = {
    logId,
    student_id: card.student_id,
    source: 'RFID',
    scanned_at: scannedAtISO,
    scan_date: scannedAtISO.slice(0, 10),   // required for DateIndex GSI
    gate_name: 'MAIN',
    raw_payload: { rfid_uid },
    created_at: new Date().toISOString(),
  };
  await putItem('GateLogs', gateLog);

  return {
    gate_log_id: logId,
    student_name: user?.full_name || 'Unknown Student',
    gr_number: student?.gr_number || 'N/A',
    source: 'RFID',
    scanned_at: gateLog.scanned_at,
  };
}

module.exports = { processRfidEntry };
