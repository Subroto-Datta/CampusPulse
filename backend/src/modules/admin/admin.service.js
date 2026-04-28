const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, updateItem, deleteItem, queryItems, scanItems, isMock } = require('../../config/db');
const AppError = require('../../utils/AppError');

function getMock() { return require('../../config/mockDb'); }

async function getDashboardStats() {
  if (isMock()) {
    const mock = getMock();
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = mock.store.gate_logs.filter(g => g.scanned_at.slice(0, 10) === today).length;
    const todayRecords = mock.store.attendance_records.filter(ar => {
      const session = mock.store.lecture_sessions.find(ls => ls.id === ar.session_id);
      return session && session.session_date === today;
    });
    const present = todayRecords.filter(ar => ['PRESENT_CONFIRMED', 'LATE_PRESENT', 'MANUAL_PRESENT'].includes(ar.status)).length;
    const pct = todayRecords.length > 0 ? Math.round(present / todayRecords.length * 1000) / 10 : 0;
    const late = todayRecords.filter(ar => ar.late_flag).length;
    const bunk = mock.store.attendance_records.filter(ar => ar.status === 'BUNK_SUSPECTED').length;
    return {
      today_entries: todayEntries, today_attendance_pct: pct, late_entries: late,
      bunk_alerts: bunk,
      low_attendance_students: 0,
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Count today's gate logs
  const allGateLogs = await queryItems('GateLogs', {
    IndexName: 'DateIndex',
    KeyConditionExpression: 'scan_date = :today',
    ExpressionAttributeValues: { ':today': today },
  });
  const todayEntries = allGateLogs.length;

  // Get today's sessions then their attendance records
  const todaySessions = await queryItems('LectureSessions', {
    IndexName: 'DateIndex',
    KeyConditionExpression: 'session_date = :today',
    ExpressionAttributeValues: { ':today': today },
  });

  let totalRecords = 0, presentCount = 0, lateCount = 0;
  for (const session of todaySessions) {
    const records = await queryItems('AttendanceRecords', {
      KeyConditionExpression: 'session_id = :sid',
      ExpressionAttributeValues: { ':sid': session.sessionId },
    });
    totalRecords += records.length;
    presentCount += records.filter(r => ['PRESENT_CONFIRMED', 'LATE_PRESENT', 'MANUAL_PRESENT'].includes(r.status)).length;
    lateCount += records.filter(r => r.late_flag).length;
  }

  // Count bunk suspects (scan all attendance records — costly but acceptable at small scale)
  const allRecords = await scanItems('AttendanceRecords', {
    FilterExpression: '#st = :bunk',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':bunk': 'BUNK_SUSPECTED' },
  });

  const pct = totalRecords > 0 ? Math.round(presentCount / totalRecords * 1000) / 10 : 0;

  return {
    today_entries: todayEntries,
    today_attendance_pct: pct,
    late_entries: lateCount,
    bunk_alerts: allRecords.length,
    low_attendance_students: 0,
  };
}

async function getGateLogs({ date, source, page = 1, limit = 50 }) {
  if (isMock()) {
    const mock = getMock();
    let logs = [...mock.store.gate_logs];
    if (date) logs = logs.filter(g => g.scanned_at.slice(0, 10) === date);
    if (source) logs = logs.filter(g => g.source === source);
    logs.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
    const total = logs.length;
    const offset = (page - 1) * limit;
    logs = logs.slice(offset, offset + parseInt(limit));
    return {
      logs: logs.map(g => {
        const s = mock.getStudent(g.student_id);
        const u = s ? mock.getUser(s.user_id) : null;
        return { id: g.id, source: g.source, scanned_at: g.scanned_at, gate_name: g.gate_name, student_name: u?.full_name, gr_number: s?.gr_number, roll_number: s?.roll_number };
      }),
      total, page: parseInt(page), limit: parseInt(limit),
    };
  }

  let logs;
  if (date) {
    // Use DateIndex GSI
    const filterParts = [];
    const exprValues = { ':date': date };
    const exprNames = {};
    if (source) {
      filterParts.push('#src = :source');
      exprValues[':source'] = source;
      exprNames['#src'] = 'source';
    }
    logs = await queryItems('GateLogs', {
      IndexName: 'DateIndex',
      KeyConditionExpression: 'scan_date = :date',
      ...(filterParts.length ? { FilterExpression: filterParts.join(' AND ') } : {}),
      ExpressionAttributeValues: exprValues,
      ...(Object.keys(exprNames).length ? { ExpressionAttributeNames: exprNames } : {}),
      ScanIndexForward: false,
    });
  } else {
    // Full scan with optional source filter
    const filterParts = [];
    const exprValues = {};
    const exprNames = {};
    if (source) {
      filterParts.push('#src = :source');
      exprValues[':source'] = source;
      exprNames['#src'] = 'source';
    }
    logs = await scanItems('GateLogs', {
      ...(filterParts.length ? { FilterExpression: filterParts.join(' AND ') } : {}),
      ...(Object.keys(exprValues).length ? { ExpressionAttributeValues: exprValues } : {}),
      ...(Object.keys(exprNames).length ? { ExpressionAttributeNames: exprNames } : {}),
    });
    logs.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
  }

  const total = logs.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const paginatedLogs = logs.slice(offset, offset + parseInt(limit));

  // Enrich with student + user data
  const enrichedLogs = [];
  for (const g of paginatedLogs) {
    let student = null;
    if (g.student_id) {
      student = await getItem('Students', { studentId: g.student_id });
    }
    
    const user = (student && student.user_id) ? await getItem('Users', { userId: student.user_id }) : null;
    enrichedLogs.push({
      id: g.logId,
      source: g.source,
      scanned_at: g.scanned_at,
      gate_name: g.gate_name,
      student_name: user?.full_name || 'N/A',
      gr_number: student?.gr_number || 'N/A',
      roll_number: student?.roll_number || 'N/A',
    });
  }

  return { logs: enrichedLogs, total, page: parseInt(page), limit: parseInt(limit) };
}

async function mapRfid({ rfid_uid, student_id }) {
  rfid_uid = (rfid_uid || '').trim().toUpperCase();
  if (isMock()) {
    const mock = getMock();
    if (mock.store.rfid_cards.find(r => r.rfid_uid === rfid_uid)) throw new AppError('RFID UID already mapped', 409);
    const card = { id: mock.uuid(), rfid_uid, student_id, is_active: true, issued_at: new Date().toISOString() };
    mock.store.rfid_cards.push(card);
    return card;
  }

  // Check if RFID UID already mapped
  const existing = await queryItems('RfidCards', {
    IndexName: 'RfidUidIndex',
    KeyConditionExpression: 'rfid_uid = :uid',
    ExpressionAttributeValues: { ':uid': rfid_uid },
    Limit: 1,
  });
  if (existing.length) throw new AppError('RFID UID already mapped', 409);

  const cardId = uuidv4();
  const now = new Date().toISOString();
  const card = {
    cardId,
    rfid_uid,
    student_id,
    is_active: true,
    issued_at: now,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  };
  await putItem('RfidCards', card);
  // Synchronize the tag to the actual student profile so the RPC function recognizes it
  await updateItem('Students', { studentId: student_id }, 'SET rfid_tag = :uid, updated_at = :now', { ':uid': rfid_uid, ':now': now });
  return { id: cardId, rfid_uid, student_id, issued_at: now };
}

async function getRfidMappings() {
  if (isMock()) {
    const mock = getMock();
    return mock.store.rfid_cards.map(rc => {
      const s = mock.getStudent(rc.student_id);
      const u = s ? mock.getUser(s.user_id) : null;
      return { id: rc.id, rfid_uid: rc.rfid_uid, is_active: rc.is_active, issued_at: rc.issued_at, student_name: u?.full_name, gr_number: s?.gr_number, roll_number: s?.roll_number };
    });
  }

  const cards = await scanItems('RfidCards');
  const enriched = [];
  for (const rc of cards) {
    const student = await getItem('Students', { studentId: rc.student_id });
    const user = student ? await getItem('Users', { userId: student.user_id }) : null;
    enriched.push({
      id: rc.cardId,
      rfid_uid: rc.rfid_uid,
      is_active: rc.is_active,
      issued_at: rc.issued_at,
      student_name: user?.full_name,
      gr_number: student?.gr_number,
      roll_number: student?.roll_number,
    });
  }
  enriched.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
  return enriched;
}

async function revokeRfid(cardId) {
  if (isMock()) {
    const mock = getMock();
    const card = mock.store.rfid_cards.find(r => r.id === cardId);
    if (!card) throw new AppError('RFID card not found', 404);
    card.is_active = false;
    return { message: 'RFID card revoked' };
  }

  const card = await getItem('RfidCards', { cardId });
  if (!card) throw new AppError('RFID card not found', 404);

  await updateItem('RfidCards', { cardId },
    'SET is_active = :inactive, revoked_at = :now, updated_at = :now',
    { ':inactive': false, ':now': new Date().toISOString() }
  );
  return { message: 'RFID card revoked' };
}

async function listSessions() {
  if (isMock()) {
    const mock = getMock();
    return mock.store.lecture_sessions.map(ls => {
      const c = mock.getCourse(ls.course_id);
      const f = mock.store.faculty.find(fac => fac.id === ls.faculty_id);
      const u = f ? mock.getUser(f.user_id) : null;
      return { ...ls, course_name: c?.name, course_code: c?.code, faculty_name: u?.full_name };
    });
  }

  const sessions = await scanItems('LectureSessions');
  const enriched = [];
  for (const ls of sessions) {
    const course = await getItem('Courses', { courseId: ls.course_id });
    const faculty = await getItem('Faculty', { facultyId: ls.faculty_id });
    const user = faculty ? await getItem('Users', { userId: faculty.user_id }) : null;
    enriched.push({
      ...ls,
      id: ls.sessionId,
      course_name: course?.name,
      course_code: course?.code,
      faculty_name: user?.full_name,
    });
  }
  enriched.sort((a, b) => {
    const dateCmp = (b.session_date || '').localeCompare(a.session_date || '');
    if (dateCmp !== 0) return dateCmp;
    return (b.start_time || '').localeCompare(a.start_time || '');
  });
  return enriched;
}

async function createSession(data) {
  if (isMock()) {
    const mock = getMock();
    const newSession = {
      id: mock.uuid(),
      faculty_id: data.faculty_id,
      course_id: data.course_id,
      division: data.division,
      session_date: data.session_date,
      start_time: data.start_time,
      end_time: data.end_time,
      is_completed: false
    };
    mock.store.lecture_sessions.push(newSession);
    return newSession;
  }

  const sessionId = uuidv4();
  const now = new Date().toISOString();
  const session = {
    sessionId,
    faculty_id: data.faculty_id,
    course_id: data.course_id,
    division: data.division,
    session_date: data.session_date,
    start_time: data.start_time,
    end_time: data.end_time,
    is_completed: false,
    created_at: now,
    updated_at: now,
  };
  await putItem('LectureSessions', session);
  return { id: sessionId, ...session };
}

async function updateSession(id, data) {
  if (isMock()) {
    const mock = getMock();
    const index = mock.store.lecture_sessions.findIndex(ls => ls.id === id);
    if (index === -1) throw new AppError('Session not found', 404);
    mock.store.lecture_sessions[index] = { ...mock.store.lecture_sessions[index], ...data };
    return mock.store.lecture_sessions[index];
  }

  const existing = await getItem('LectureSessions', { sessionId: id });
  if (!existing) throw new AppError('Session not found', 404);

  const updateParts = [];
  const exprValues = { ':now': new Date().toISOString() };
  const exprNames = {};
  let idx = 0;
  for (const [key, val] of Object.entries(data)) {
    const placeholder = `:val${idx}`;
    const nameKey = `#k${idx}`;
    exprNames[nameKey] = key;
    exprValues[placeholder] = val;
    updateParts.push(`${nameKey} = ${placeholder}`);
    idx++;
  }
  updateParts.push('updated_at = :now');

  const updated = await updateItem('LectureSessions', { sessionId: id },
    `SET ${updateParts.join(', ')}`,
    exprValues,
    Object.keys(exprNames).length ? exprNames : undefined
  );
  return { id, ...updated };
}

async function deleteSession(id) {
  if (isMock()) {
    const mock = getMock();
    const index = mock.store.lecture_sessions.findIndex(ls => ls.id === id);
    if (index === -1) throw new AppError('Session not found', 404);
    mock.store.lecture_sessions.splice(index, 1);
    return { message: 'Session deleted' };
  }

  const deleted = await deleteItem('LectureSessions', { sessionId: id });
  if (!deleted) throw new AppError('Session not found', 404);
  return { message: 'Session deleted' };
}

async function listCourses() {
  if (isMock()) {
    const mock = getMock();
    return mock.store.courses;
  }
  const courses = await scanItems('Courses');
  return courses.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

async function createCourse(data) {
  if (isMock()) {
    const mock = getMock();
    const id = mock.uuid();
    const course = { id, ...data };
    mock.store.courses.push(course);
    return course;
  }
  const courseId = uuidv4();
  const now = new Date().toISOString();
  const course = {
    courseId,
    name: data.name,
    code: data.code,
    department_id: data.department_id || 'd0000000-0000-0000-0000-000000000001',
    semester: parseInt(data.semester) || 1,
    credits: parseInt(data.credits) || 3,
    created_at: now,
    updated_at: now,
  };

  await putItem('Courses', course);
  return { id: courseId, ...course };
}

async function updateCourse(id, data) {
  if (isMock()) {
    const mock = getMock();
    const idx = mock.store.courses.findIndex(c => c.id === id);
    if (idx === -1) throw new AppError('Course not found', 404);
    mock.store.courses[idx] = { ...mock.store.courses[idx], ...data };
    return mock.store.courses[idx];
  }
  const now = new Date().toISOString();
  const updated = await updateItem('Courses', { courseId: id },
    'SET #n = :name, code = :code, updated_at = :now',
    { ':name': data.name, ':code': data.code, ':now': now },
    { '#n': 'name' }
  );
  return { id, ...updated };
}

async function deleteCourse(id) {
  if (isMock()) {
    const mock = getMock();
    mock.store.courses = mock.store.courses.filter(c => c.id !== id);
    return { success: true };
  }
  await deleteItem('Courses', { courseId: id });
  return { success: true };
}

module.exports = {
  getDashboardStats,
  getGateLogs,
  mapRfid,
  getRfidMappings,
  revokeRfid,
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
};


