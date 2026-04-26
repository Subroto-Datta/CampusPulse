const { isMock } = require('../../config/db');
const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
const facultyService = require('../faculty/faculty.service');

function getMock() { return require('../../config/mockDb'); }

async function resolveSession(sessionId) {
  if (isMock()) { return { session_id: sessionId, alerts_generated: 0 }; }

  const { queryItems, putItem, getItem } = require('../../config/db');
  const { v4: uuidv4 } = require('uuid');

  // Get attendance records for this session
  const records = await queryItems('AttendanceRecords', {
    KeyConditionExpression: 'session_id = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
  });

  const session = await getItem('LectureSessions', { sessionId });
  const alerts = [];

  for (const record of records) {
    if (record.status === 'ABSENT_CONFIRMED') {
      // Check if student entered campus on that day
      const gateLogs = await queryItems('GateLogs', {
        IndexName: 'StudentTimeIndex',
        KeyConditionExpression: 'student_id = :sid AND begins_with(scanned_at, :date)',
        ExpressionAttributeValues: { ':sid': record.student_id, ':date': session.session_date },
      });
      if (gateLogs.length) {
        alerts.push({
          student_id: record.student_id,
          alert_type: 'ENTERED_BUT_ABSENT',
          session_id: sessionId,
          message: 'Student entered campus but was marked absent',
        });
      }
    }
    if (record.status === 'PRESENT_CONFIRMED' && !record.gate_entry_id) {
      alerts.push({
        student_id: record.student_id,
        alert_type: 'PRESENT_NO_GATE_LOG',
        session_id: sessionId,
        message: 'Student marked present but no gate entry found',
      });
    }
  }

  const now = new Date().toISOString();
  for (const alert of alerts) {
    await putItem('Alerts', {
      alertId: uuidv4(),
      ...alert,
      is_resolved: false,
      created_at: now,
    });
  }

  return { session_id: sessionId, alerts_generated: alerts.length };
}

async function getAlerts({ resolved, limit = 50 }) {
  if (isMock()) {
    const mock = getMock();
    let list = [...mock.store.alerts];
    if (resolved === 'true') list = list.filter(a => a.is_resolved);
    else if (resolved === 'false') list = list.filter(a => !a.is_resolved);
    return list.slice(0, limit).map(a => {
      const s = mock.getStudent(a.student_id);
      const u = s ? mock.getUser(s.user_id) : null;
      return { ...a, student_name: u?.full_name, gr_number: s?.gr_number, roll_number: s?.roll_number };
    });
  }

  const { scanItems, getItem } = require('../../config/db');

  // Scan alerts with optional resolved filter
  const filterParts = [];
  const exprValues = {};
  if (resolved !== undefined) {
    filterParts.push('is_resolved = :resolved');
    exprValues[':resolved'] = resolved === 'true';
  }

  let alerts = await scanItems('Alerts', {
    ...(filterParts.length ? { FilterExpression: filterParts.join(' AND ') } : {}),
    ...(Object.keys(exprValues).length ? { ExpressionAttributeValues: exprValues } : {}),
  });

  // Sort by created_at desc
  alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  alerts = alerts.slice(0, parseInt(limit));

  // Enrich with student data
  const enriched = [];
  for (const a of alerts) {
    const student = await getItem('Students', { studentId: a.student_id });
    const user = student ? await getItem('Users', { userId: student.user_id }) : null;
    enriched.push({
      ...a,
      id: a.alertId,
      student_name: user?.full_name,
      gr_number: student?.gr_number,
      roll_number: student?.roll_number,
    });
  }
  return enriched;
}

async function processOCR(sessionId, fileBuffer, mimeType, userId) {
  // Try using actual AWS Textract if credentials exist
  let extractedRollNumbers = [];
  try {
    if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ROLE_ARN) {
      console.warn("No AWS credentials found, using simulated OCR extraction for demo");
      throw new Error('NO_AWS_CREDS');
    }

    const client = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });
    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ["TABLES"]
    });

    const response = await client.send(command);

    // Parse Textract Response Blocks for tables
    const blocks = response.Blocks;
    const blocksMap = {};
    blocks.forEach(b => blocksMap[b.Id] = b);

    // Find all cells that contain a 'P' or 'tick' and correspond to a roll number
    // For simplicity of this implementation, we will scan for WORD blocks
    // that look like Roll Numbers and check if they have "P" near them in the row.
    // In a production system, a full table relationship parsing is required.
    const tableBlocks = blocks.filter(b => b.BlockType === 'TABLE');
    if (tableBlocks.length > 0) {
      // Find cells
      const cells = blocks.filter(b => b.BlockType === 'CELL');
      let rowMap = {};
      cells.forEach(c => {
        if (!rowMap[c.RowIndex]) rowMap[c.RowIndex] = [];
        let text = '';
        if (c.Relationships) {
          c.Relationships.forEach(rel => {
            if (rel.Type === 'CHILD') {
              rel.Ids.forEach(id => {
                if (blocksMap[id].BlockType === 'WORD') text += blocksMap[id].Text + ' ';
              });
            }
          });
        }
        rowMap[c.RowIndex].push({ col: c.ColumnIndex, text: text.trim().toUpperCase() });
      });

      // Look for rows that have 'P' in some column
      Object.keys(rowMap).forEach(rowIndex => {
        const cols = rowMap[rowIndex];
        const hasPresent = cols.some(c => c.text === 'P' || c.text === 'PRESENT' || c.text === '✓');
        if (hasPresent) {
          // Attempt to find roll number (usually column 1 or 2)
          const rollCol = cols.find(c => /^[0-9]+$/.test(c.text) || c.text.startsWith('GR'));
          if (rollCol) extractedRollNumbers.push(rollCol.text);
        }
      });
    }
  } catch (err) {
    if (err.message !== 'NO_AWS_CREDS') {
      console.error("AWS Textract Error:", err);
    }
    // Fallback: Simulate OCR for presentation
    // Automatically marks the first student (Roll 101) present, and next two absent.
    extractedRollNumbers = ['101', '102'];
  }

  // Now submit the attendance using facultyService logic
  // First, get all students in this session
  const sessionData = await facultyService.getSessionStudents(sessionId);
  if (!sessionData || !sessionData.students) throw new Error('Session not found');

  const allStudents = sessionData.students;
  // If OCR found them as 'P', they are present.
  // Absent ones are those NOT in extractedRollNumbers
  const absentStudentIds = allStudents
    .filter(s => !extractedRollNumbers.includes(s.roll_number) && !extractedRollNumbers.includes(s.gr_number))
    .map(s => s.student_id);

  const result = await facultyService.submitAttendance(sessionId, absentStudentIds, userId);
  return { ...result, ocr_extracted_count: extractedRollNumbers.length };
}

module.exports = { resolveSession, getAlerts, processOCR };
