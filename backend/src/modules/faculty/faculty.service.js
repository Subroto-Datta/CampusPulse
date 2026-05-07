const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
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

  const user = await getItem('Users', { userId });
  if (!user) return [];

  const today = new Date().toISOString().slice(0, 10);
  let sessions = [];

  if (user.role === 'admin') {
    // Admin sees all sessions for today
    sessions = await queryItems('LectureSessions', {
      IndexName: 'DateIndex',
      KeyConditionExpression: 'session_date = :today',
      ExpressionAttributeValues: { ':today': today },
    });
  } else {
    // Faculty sees only their sessions
    const faculties = await queryItems('Faculty', {
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: 1,
    });
    if (!faculties.length) return [];
    const fac = faculties[0];

    sessions = await queryItems('LectureSessions', {
      IndexName: 'DateIndex',
      KeyConditionExpression: 'session_date = :today',
      FilterExpression: 'faculty_id = :fid',
      ExpressionAttributeValues: { ':today': today, ':fid': fac.facultyId },
    });
  }

  const enriched = [];
  for (const ls of sessions) {
    const course = await getItem('Courses', { courseId: ls.course_id });
    const faculty = await getItem('Faculty', { facultyId: ls.faculty_id });
    const facUser = faculty ? await getItem('Users', { userId: faculty.user_id }) : null;
    
    enriched.push({
      id: ls.sessionId,
      session_date: ls.session_date,
      start_time: ls.start_time,
      end_time: ls.end_time,
      division: ls.division,
      is_completed: ls.is_completed,
      course_name: course?.name,
      course_code: course?.code,
      faculty_name: facUser?.full_name || 'N/A',
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
    const course = mock.store.courses.find(c => c.id === session.course_id);
    const studs = mock.store.students.filter(s => s.division === session.division && s.semester === course?.semester).map(s => {
      const u = mock.getUser(s.user_id);
      const ar = mock.store.attendance_records.find(a => a.session_id === sessionId && a.student_id === s.id);
      return { student_id: s.id, gr_number: s.gr_number, roll_number: s.roll_number, division: s.division, full_name: u?.full_name, attendance_status: ar?.status || null };
    }).filter(Boolean).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
    return { session_id: sessionId, course_id: session.course_id, division: session.division, is_completed: session.is_completed, students: studs };
  }

  const session = await getItem('LectureSessions', { sessionId });
  if (!session) throw new AppError('Session not found', 404);

  const course = await getItem('Courses', { courseId: session.course_id });
  if (!course) throw new AppError('Course not found', 404);

  // Directly fetch students and filter in memory to handle data type/case mismatches in Supabase
  const students = await scanItems('Students');
  const validStudents = students.filter(s => 
    String(s.division || '').trim().toUpperCase() === String(session.division || '').trim().toUpperCase() &&
    Number(s.semester) === Number(course.semester)
  );

  // Get attendance records for this session to map to students
  const attendanceRecords = await queryItems('AttendanceRecords', {
    KeyConditionExpression: 'session_id = :sid',
    ExpressionAttributeValues: { ':sid': sessionId },
  });

  const studs = [];
  
  for (const student of validStudents) {
    const user = await getItem('Users', { userId: student.user_id });
    const ar = attendanceRecords.find(a => a.student_id === student.studentId);
    studs.push({
      student_id: student.studentId,
      gr_number: student.gr_number,
      roll_number: student.roll_number,
      division: student.division,
      semester: student.semester,
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
    const course = mock.store.courses.find(c => c.id === session.course_id);
    const validStudents = mock.store.students.filter(s => s.division === session.division && s.semester === course?.semester);
    const absentSet = new Set(absentStudentIds || []);
    mock.store.attendance_records = mock.store.attendance_records.filter(ar => ar.session_id !== sessionId);
    let presentCount = 0;
    for (const s of validStudents) {
      const isAbsent = absentSet.has(s.id);
      const gateEntry = mock.store.gate_logs.find(g => g.student_id === s.id && g.scanned_at.slice(0, 10) === session.session_date);
      let status = 'NEEDS_REVIEW', lateFlag = false, gateEntryId = null;

      if (isAbsent && gateEntry) { 
        status = 'BUNK_SUSPECTED'; 
        gateEntryId = gateEntry.id; 
      } else if (isAbsent) { 
        status = 'ABSENT_CONFIRMED'; 
      } else if (gateEntry) {
        gateEntryId = gateEntry.id;
        const scanDate = new Date(gateEntry.scanned_at);
        const sessionStart = new Date(session.session_date + 'T' + session.start_time);
        const diffMin = (scanDate - sessionStart) / 60000;
        if (diffMin <= 15) { status = 'PRESENT_CONFIRMED'; presentCount++; }
        else { status = 'LATE_PRESENT'; lateFlag = true; presentCount++; }
      } else {
        status = 'PROXY_SUSPECTED'; presentCount++;
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
    const total = validStudents.length;
    return { session_id: sessionId, total_students: total, absent_count: absentSet.size, present_count: total - absentSet.size };
  }

  // Verify session belongs to this faculty
  const session = await getItem('LectureSessions', { sessionId });
  if (!session) throw new AppError('Session not found or unauthorized', 403);

  // Verify ownership or Admin role
  const user = await getItem('Users', { userId });
  if (!user) throw new AppError('User not found', 401);

  if (user.role !== 'admin') {
    const faculties = await queryItems('Faculty', {
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: 1,
    });
    if (!faculties.length || faculties[0].facultyId !== session.faculty_id) {
      throw new AppError('Session not found or unauthorized', 403);
    }
  }


  const course = await getItem('Courses', { courseId: session.course_id });
  if (!course) throw new AppError('Course not found', 404);

  // Directly fetch valid students and filter in memory for robustness
  const students = await scanItems('Students');
  const validStudents = students.filter(s => 
    String(s.division || '').trim().toUpperCase() === String(session.division || '').trim().toUpperCase() &&
    Number(s.semester) === Number(course.semester)
  );

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

  for (const student of validStudents) {
    totalStudents++;

    const isAbsent = absentSet.has(student.studentId);

    // Check gate entry for this student on session date
    const gateLogs = await queryItems('GateLogs', {
      IndexName: 'StudentTimeIndex',
      KeyConditionExpression: 'student_id = :sid',
      FilterExpression: '#sd = :date',
      ExpressionAttributeNames: { '#sd': 'scan_date' },
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
      status = 'PROXY_SUSPECTED';
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
    let user = null;
    if (f.user_id) {
      user = await getItem('Users', { userId: f.user_id });
    }
    
    let dept = null;
    if (f.department_id) {
      dept = await getItem('Departments', { departmentId: f.department_id });
    }

    enriched.push({
      ...f,
      id: f.facultyId,
      full_name: user?.full_name || 'N/A',
      email: user?.email || 'N/A',
      phone: user?.phone || 'N/A',
      is_active: user?.is_active,
      department_name: dept ? dept.name : (f.department || 'N/A'),
    });
  }
  return enriched;
}

async function createFaculty(data) {
  try {
    if (isMock()) {
      const mock = getMock();
      const newId = mock.uuid();
      const userId = mock.uuid();
      mock.store.users.push({
        id: userId, email: data.email || `f${Date.now()}@campuspulse.edu`, role: 'faculty',
        full_name: data.full_name, is_active: data.is_active !== false, password_hash: 'hash'
      });
      mock.store.faculty.push({ id: newId, user_id: userId, ...data });
      return { id: newId, ...data };
    }

    const now = new Date().toISOString();

    // Check if user already exists with this email
    let userId;
    const existingUsers = await queryItems('Users', {
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': data.email?.trim().toLowerCase() || '' },
      Limit: 1
    });

    if (existingUsers.length > 0) {
      userId = existingUsers[0].userId;
      console.log(`[FacultyService] Found existing user [${userId}] for email ${data.email}`);
    } else {
      userId = uuidv4();
      const password_hash = await bcrypt.hash('Password123!', 12);
      const user = {
        userId,
        email: data.email || `faculty_${Date.now()}@campuspulse.edu`,
        password_hash,
        role: 'faculty',
        full_name: data.full_name || 'Unknown Faculty',
        phone: data.phone || null,
        is_active: data.is_active !== false,
        last_login: null,
        created_at: now,
        updated_at: now,
      };
      await putItem('Users', user);
    }

    const facultyId = uuidv4();
    const faculty = {
      facultyId,
      user_id: userId,
      department_id: data.department_id || 'd0000000-0000-0000-0000-000000000001',
      employee_id: data.employee_id || `FAC_${Date.now()}`,
      designation: data.designation || 'Faculty Member',
      created_at: now,
      updated_at: now,
    };
    await putItem('Faculty', faculty);
    return { id: facultyId, ...faculty, full_name: data.full_name, email: data.email, phone: data.phone, is_active: data.is_active };
  } catch (err) {
    console.error('[FacultyService] Error creating faculty:', err);
    throw err;
  }
}

async function updateFaculty(id, data) {
  if (isMock()) {
    const mock = getMock();
    const idx = mock.store.faculty.findIndex(f => f.id === id);
    if (idx === -1) throw new AppError('Not found', 404);
    mock.store.faculty[idx] = { ...mock.store.faculty[idx], ...data };
    const uIdx = mock.store.users.findIndex(u => u.id === mock.store.faculty[idx].user_id);
    if (uIdx !== -1) {
      if (data.full_name) mock.store.users[uIdx].full_name = data.full_name;
      if (data.email) mock.store.users[uIdx].email = data.email;
      if (data.phone) mock.store.users[uIdx].phone = data.phone;
      if (data.is_active !== undefined) mock.store.users[uIdx].is_active = data.is_active;
    }
    return mock.store.faculty[idx];
  }

  const existing = await getItem('Faculty', { facultyId: id });
  if (!existing) throw new AppError('Faculty not found', 404);

  if (data.full_name || data.email || data.phone || data.is_active !== undefined) {
    const userUpdates = [];
    const userValues = { ':now': new Date().toISOString() };
    const userNames = {};
    let uIdx = 0;
    
    if (data.full_name) { userNames[`#uk${uIdx}`] = 'full_name'; userValues[`:uval${uIdx}`] = data.full_name; userUpdates.push(`#uk${uIdx} = :uval${uIdx}`); uIdx++; }
    if (data.email) { userNames[`#uk${uIdx}`] = 'email'; userValues[`:uval${uIdx}`] = data.email; userUpdates.push(`#uk${uIdx} = :uval${uIdx}`); uIdx++; }
    if (data.phone !== undefined) { userNames[`#uk${uIdx}`] = 'phone'; userValues[`:uval${uIdx}`] = data.phone; userUpdates.push(`#uk${uIdx} = :uval${uIdx}`); uIdx++; }
    if (data.is_active !== undefined) { userNames[`#uk${uIdx}`] = 'is_active'; userValues[`:uval${uIdx}`] = data.is_active; userUpdates.push(`#uk${uIdx} = :uval${uIdx}`); uIdx++; }
    
    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = :now');
      await updateItem('Users', { userId: existing.user_id },
        `SET ${userUpdates.join(', ')}`,
        userValues,
        Object.keys(userNames).length ? userNames : undefined
      );
    }
  }

  const facultyData = { ...data };
  delete facultyData.full_name;
  delete facultyData.email;
  delete facultyData.phone;
  delete facultyData.is_active;

  if (Object.keys(facultyData).length === 0) {
    return { id, ...existing, ...data };
  }

  const updateParts = [];
  const exprValues = { ':now': new Date().toISOString() };
  const exprNames = {};
  let idx = 0;
  for (const [key, val] of Object.entries(facultyData)) {
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
  return { id, ...updated, ...data };
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
