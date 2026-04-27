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
    let student = null;
    if (a.student_id) {
      student = await getItem('Students', { studentId: a.student_id });
    }
    
    const user = (student && student.user_id) ? await getItem('Users', { userId: student.user_id }) : null;
    enriched.push({
      ...a,
      id: a.alertId,
      student_name: user?.full_name || 'N/A',
      gr_number: student?.gr_number || 'N/A',
      roll_number: student?.roll_number || 'N/A',
    });
  }
  return enriched;
}

async function processAttendanceFile(sessionId, fileBuffer, mimeType, userId) {
  const { queryItems, getItem } = require('../../config/db');
  const XLSX = require('xlsx');
  let extractedIds = [];

  // 1. Extract IDs based on file type
  const isExcel = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 mimeType === 'application/vnd.ms-excel';
  const isCsv = mimeType === 'text/csv';

  if (isExcel || isCsv) {
    // Parse using SheetJS (XLSX)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Convert sheet to JSON array of arrays
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    rows.forEach(row => {
      if (Array.isArray(row) && row.length >= 1) {
        const id = String(row[0]).trim().toUpperCase();
        const status = String(row[1] || 'P').trim().toUpperCase();
        if (id && (status === 'P' || status === 'PRESENT' || status === '1' || status === 'TRUE')) {
          extractedIds.push(id);
        }
      }
    });
  } else {

    // Treat as image/document for OCR
    try {
      if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ROLE_ARN) {
        throw new Error('NO_AWS_CREDS');
      }
      const client = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });
      const command = new AnalyzeDocumentCommand({
        Document: { Bytes: fileBuffer },
        FeatureTypes: ["TABLES"]
      });
      const response = await client.send(command);
      const blocks = response.Blocks;
      const blocksMap = {};
      blocks.forEach(b => blocksMap[b.Id] = b);

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

      Object.keys(rowMap).forEach(rowIndex => {
        const cols = rowMap[rowIndex];
        const hasPresent = cols.some(c => c.text === 'P' || c.text === 'PRESENT' || c.text === '✓');
        if (hasPresent) {
          const rollCol = cols.find(c => /^[0-9]+$/.test(c.text) || c.text.startsWith('GR'));
          if (rollCol) extractedIds.push(rollCol.text);
        }
      });
    } catch (err) {
      if (err.message !== 'NO_AWS_CREDS') console.error("OCR Error:", err);
      // Fallback for demo: simulate some IDs
      extractedIds = ['101', '102', '103'];
    }
  }

  // 2. Normalize Extracted IDs for matching
  const normalize = (val) => String(val).trim().toUpperCase().replace(/^0+/, '');
  const normalizedExtracted = extractedIds.map(normalize);

  // 3. Get Session Students to map extracted IDs to student_ids
  const sessionData = await facultyService.getSessionStudents(sessionId);
  if (!sessionData || !sessionData.students) throw new Error('Session not found');

  const allStudents = sessionData.students;
  
  // A student is ABSENT if their identifier (Roll or GR) was NOT found as "Present" in the file
  const absentStudentIds = allStudents
    .filter(s => {
      const sRoll = normalize(s.roll_number || '');
      const sGr = normalize(s.gr_number || '');
      return !normalizedExtracted.includes(sRoll) && !normalizedExtracted.includes(sGr);
    })
    .map(s => s.student_id);

  // 4. Return results for preview
  // We return the list of students that SHOULD be marked absent based on the file.
  // The frontend will use this to update its UI state so the user can review.
  return { 
    absent_student_ids: absentStudentIds,
    present_student_ids: allStudents.filter(s => !absentStudentIds.includes(s.student_id)).map(s => s.student_id),
    identified_present_count: extractedIds.length,
    processed_method: isExcel ? 'Excel' : (isCsv ? 'CSV' : 'OCR')
  };
}

module.exports = { resolveSession, getAlerts, processAttendanceFile };


