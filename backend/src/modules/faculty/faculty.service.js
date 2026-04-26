const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, updateItem, deleteItem, queryItems, scanItems, isMock } = require('../../config/db');
const AppError = require('../../utils/AppError');

function getMock() { return require('../../config/mockDb'); }

async function getTodaySessions(userId) {
  if (isMock()) {
    const mock = getMock();
    const fac = mock.getFacultyByUserId(userId);
    if (!fac) return [];
    return mock.store.lecture_sessions
      .filter(ls => ls.faculty_id === fac.id && ls.session_date === new Date().toISOString().slice(0, 10))
      .map(ls => {
        const c = mock.getCourse(ls.course_id);
        return { id: ls.id, session_date: ls.session_date, start_time: ls.start_time, end_time: ls.end_time, division: ls.division, is_completed: ls.is_completed, course_name: c?.name, course_code: c?.code };
      });
  }

  // Find faculty record by user_id
  const faculties = await queryItems('Faculty', {
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });
  if (!faculties.length) return [];
  const fac = faculties[0];

  const today = new Date().toISOString().slice(0, 10);
  // Get today's sessions, filter by faculty
  const sessions = await queryItems('LectureSessions', {
    IndexName: 'DateIndex',
    KeyConditionExpression: 'session_date = :today',
    FilterExpression: 'faculty_id = :fid',
    ExpressionAttributeValues: { ':today': today, ':fid': fac.facultyId },
  });

  const enriched = [];
  for (const ls of sessions) {
    const course = await getItem('Courses', { courseId: ls.course_id });
    enriched.push({
      id: ls.sessionId,
      session_date: ls.session_date,
      start_time: ls.start_time,
      end_time: ls.end_time,
      division: ls.division,
      is_completed: ls.is_completed,
      course_name: course?.name,
      course_code: course?.code,
    });
  }
  enriched.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  return enriched;
}

async function getSessionStudents(sessionId) {
  if (isMock()) {
    const mock = getMock();
    const session = mock.store.lecture_sessions.find(ls => ls.id === sessionId);
    if (!session) throw new AppError('Session not found', 404);
    const enrolled = mock.store.enrollments.filter(e => e.course_id === session.course_id);
    const studs = enrolled.map(e => {
      const s = mock.getStudent(e.student_id);
      if (!s || s.division !== session.division) return null;
      const u = mock.getUser(s.user_id);
      const ar = mock.store.attendance_records.find(a => a.session_id === sessionId && a.student_id === s.id);
      return { student_id: s.id, gr_number: s.gr_number, roll_number: s.roll_number, division: s.division, full_name: u?.full_name, attendance_status: ar?.status || null };
    }).filter(Boolean).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
    return { session_id: sessionId, course_id: session.course_id, division: session.division, is_completed: session.is_completed, students: studs };
  }

  const session = await getItem('LectureSessions', { sessionId });
  if (!session) throw new AppError('Session not found', 404);

  // Get enrollments for this course
  const enrollments = await queryItems('Enrollments', {
    IndexName: 'CourseIndex',
    KeyConditionExpression: 'course_id = :cid',
    ExpressionAttributeValues: { ':cid': session.course_id },
  });

  // Get attendance records for this session
  const attendanceRecords = await queryItems('AttendanceRecords', {
    KeyConditionExpression: 'session_id = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
  });

  const studs = [];
  for (const e of enrollments) {
    const student = await getItem('Students', { studentId: e.student_id });
    if (!student || student.division !== session.division) continue;
    const user = await getItem('Users', { userId: student.user_id });
    const ar = attendanceRecords.find(a => a.student_id === student.studentId);
    studs.push({
      student_id: student.studentId,
      gr_number: student.gr_number,
      roll_number: student.roll_number,
      division: student.division,
      full_name: user?.full_name,
      attendance_status: ar?.status || null,
    });
  }
  studs.sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));

  return {
    session_id: sessionId,
    course_id: session.course_id,
    division: session.division,
    is_completed: session.is_completed,
    students: studs,
  };
}

async function submitAttendance(sessionId, absentStudentIds, userId) {
  if (isMock()) {
    const mock = getMock();
    const session = mock.store.lecture_sessions.find(ls => ls.id === sessionId);
    if (!session) throw new AppError('Session not found or unauthorized', 403);
    const enrolled = mock.store.enrollments.filter(e => e.course_id === session.course_id);
    const absentSet = new Set(absentStudentIds || []);
    mock.store.attendance_records = mock.store.attendance_records.filter(ar => ar.session_id !== sessionId);
    let presentCount = 0;
    for (const e of enrolled) {
      const s = mock.getStudent(e.student_id);
      if (!s || s.division !== session.division) continue;
      const isAbsent = absentSet.has(s.id);
      const gateEntry = mock.store.gate_logs.find(g => g.student_id === s.id && g.scanned_at.slice(0, 10) === session.session_date);
      let status = 'NEEDS_REVIEW', lateFlag = false, gateEntryId = null;

      if (isAbsent && gateEntry) { status = 'BUNK_SUSPECTED'; gateEntryId = gateEntry.id; }
      else if (isAbsent) { status = 'ABSENT_CONFIRMED'; }
      else if (gateEntry) {
        gateEntryId = gateEntry.id;
        const scanDate = new Date(gateEntry.scanned_at);
        const sessionStart = new Date(session.session_date + 'T' + session.start_time);
        const diffMin = (scanDate - sessionStart) / 60000;
        if (diffMin <= 15) { status = 'PRESENT_CONFIRMED'; presentCount++; }
        else { status = 'LATE_PRESENT'; lateFlag = true; presentCount++; }
      } else {
        status = 'MANUAL_PRESENT'; presentCount++;
      }

      mock.store.attendance_records.push({ id: mock.uuid(), session_id: sessionId, student_id: s.id, status, marked_by_faculty: true, gate_entry_id: gateEntryId, late_flag: lateFlag });

      if (status === 'BUNK_SUSPECTED') {
        const pastBunks = mock.store.attendance_records.filter(ar => ar.student_id === s.id && ar.status === 'BUNK_SUSPECTED').length;
        if (pastBunks >= 3) {
          mock.store.alerts.push({ id: mock.uuid(), student_id: s.id, alert_type: 'RISK_FLAG', session_id: sessionId, message: 'Repeated suspicious mismatches (3+ in 30 days)', is_resolved: false });
        }
      }
    }
    session.is_completed = true;
    const total = enrolled.filter(e => { const s = mock.getStudent(e.student_id); return s && s.division === session.division; }).length;
    return { session_id: sessionId, total_students: total, absent_count: absentSet.size, present_count: total - absentSet.size };
  }

  // Verify session belongs to this faculty
  const session = await getItem('LectureSessions', { sessionId });
  if (!session) throw new AppError('Session not found or unauthorized', 403);

  // Verify faculty ownership
  const faculties = await queryItems('Faculty', {
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });
  if (!faculties.length || faculties[0].facultyId !== session.faculty_id) {
    throw new AppError('Session not found or unauthorized', 403);
  }

  // Get enrolled students
  const enrollments = await queryItems('Enrollments', {
    IndexName: 'CourseIndex',
    KeyConditionExpression: 'course_id = :cid',
    ExpressionAttributeValues: { ':cid': session.course_id },
  });

  const absentSet = new Set(absentStudentIds || []);

  // Delete old attendance records for this session
  const oldRecords = await queryItems('AttendanceRecords', {
    KeyConditionExpression: 'session_id = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
  });
  for (const old of oldRecords) {
    await deleteItem('AttendanceRecords', { session_id: old.session_id, student_id: old.student_id });
  }

  let totalStudents = 0;
  const now = new Date().toISOString();

  for (const e of enrollments) {
    const student = await getItem('Students', { studentId: e.student_id });
    if (!student || student.division !== session.division) continue;
    totalStudents++;

    const isAbsent = absentSet.has(student.studentId);

    // Check gate entry for this student on session date
    const gateLogs = await queryItems('GateLogs', {
      IndexName: 'StudentTimeIndex',
      KeyConditionExpression: 'student_id = :sid AND begins_with(scanned_at, :date)',
      ExpressionAttributeValues: { ':sid': student.studentId, ':date': session.session_date },
      ScanIndexForward: true,
      Limit: 1,
    });
    const gateEntry = gateLogs[0] || null;

    let status = 'NEEDS_REVIEW', gateEntryId = null, lateFlag = false;

    if (isAbsent && gateEntry) {
      status = 'BUNK_SUSPECTED';
      gateEntryId = gateEntry.logId;
    } else if (isAbsent) {
      status = 'ABSENT_CONFIRMED';
    } else if (gateEntry) {
      gateEntryId = gateEntry.logId;
      const scanDate = new Date(gateEntry.scanned_at);
      const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
      const diffMin = (scanDate - sessionStart) / 60000;
      if (diffMin <= 15) {
        status = 'PRESENT_CONFIRMED';
      } else {
        status = 'LATE_PRESENT';
        lateFlag = true;
      }
    } else {
      status = 'MANUAL_PRESENT';
    }

    await putItem('AttendanceRecords', {
      session_id: sessionId,
      student_id: student.studentId,
      status,
      marked_by_faculty: true,
      gate_entry_id: gateEntryId,
      late_flag: lateFlag,
      resolved_at: now,
      created_at: now,
      updated_at: now,
    });

    // Check for repeated bunk suspects
    if (status === 'BUNK_SUSPECTED') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const allStudentRecords = await queryItems('AttendanceRecords', {
        IndexName: 'StudentIndex',
        KeyConditionExpression: 'student_id = :sid',
        FilterExpression: '#st = :bunk',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':sid': student.studentId, ':bunk': 'BUNK_SUSPECTED' },
      });
      const recentBunks = allStudentRecords.filter(r => (r.created_at || '') >= thirtyDaysAgo);
      if (recentBunks.length >= 3) {
        await putItem('Alerts', {
          alertId: uuidv4(),
          student_id: student.studentId,
          alert_type: 'RISK_FLAG',
          session_id: sessionId,
          message: 'Repeated suspicious mismatches (3+ in 30 days)',
          is_resolved: false,
          created_at: now,
        });
      }
    }
  }

  // Mark session as completed
  await updateItem('LectureSessions', { sessionId },
    'SET is_completed = :done, updated_at = :now',
    { ':done': true, ':now': now }
  );

  return {
    session_id: sessionId,
    total_students: totalStudents,
    absent_count: absentSet.size,
    present_count: totalStudents - absentSet.size,
  };
}

async function listFaculties() {
  if (isMock()) {
    const mock = getMock();
    return mock.store.faculty.map(f => {
      const u = mock.getUser(f.user_id);
      const d = mock.getDept(f.department_id);
      return { ...f, full_name: u?.full_name, email: u?.email, phone: u?.phone, is_active: u?.is_active, department_name: d ? d.name : f.department };
    });
  }

  const allFaculty = await scanItems('Faculty');
  const enriched = [];
  for (const f of allFaculty) {
    const user = await getItem('Users', { userId: f.user_id });
    const dept = f.department_id ? await getItem('Departments', { departmentId: f.department_id }) : null;
    enriched.push({
      ...f,
      id: f.facultyId,
      full_name: user?.full_name,
      email: user?.email,
      phone: user?.phone,
      is_active: user?.is_active,
      department_name: dept ? dept.name : f.department,
    });
  }
  return enriched;
}

async function createFaculty(data) {
  if (isMock()) {
    const mock = getMock();
    const newId = mock.uuid();
    mock.store.faculty.push({ id: newId, ...data });
    return { id: newId, ...data };
  }

  const facultyId = uuidv4();
  const now = new Date().toISOString();
  const faculty = {
    facultyId,
    user_id: data.user_id,
    department_id: data.department_id,
    employee_id: data.employee_id,
    designation: data.designation,
    department: data.department,
    created_at: now,
    updated_at: now,
  };
  await putItem('Faculty', faculty);
  return { id: facultyId, ...faculty };
}

async function updateFaculty(id, data) {
  if (isMock()) {
    const mock = getMock();
    const idx = mock.store.faculty.findIndex(f => f.id === id);
    if (idx === -1) throw new AppError('Not found', 404);
    mock.store.faculty[idx] = { ...mock.store.faculty[idx], ...data };
    return mock.store.faculty[idx];
  }

  const existing = await getItem('Faculty', { facultyId: id });
  if (!existing) throw new AppError('Faculty not found', 404);

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

  const updated = await updateItem('Faculty', { facultyId: id },
    `SET ${updateParts.join(', ')}`,
    exprValues,
    Object.keys(exprNames).length ? exprNames : undefined
  );
  return { id, ...updated };
}

async function deleteFaculty(id) {
  if (isMock()) {
    const mock = getMock();
    mock.store.faculty = mock.store.faculty.filter(f => f.id !== id);
    return { success: true };
  }

  const deleted = await deleteItem('Faculty', { facultyId: id });
  if (!deleted) throw new AppError('Faculty not found', 404);
  return { success: true };
}

module.exports = {
  getTodaySessions,
  getSessionStudents,
  submitAttendance,
  listFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty
};
