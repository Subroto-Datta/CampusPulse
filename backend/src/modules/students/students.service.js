const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getItem, putItem, updateItem, deleteItem, queryItems, scanItems, isMock } = require('../../config/db');
const AppError = require('../../utils/AppError');

function getMock() { return require('../../config/mockDb'); }

async function listStudents({ search, department, page = 1, limit = 50 }) {
  if (isMock()) {
    const mock = getMock();
    let list = mock.store.students.map(s => {
      const u = mock.getUser(s.user_id);
      const d = mock.getDept(s.department_id);
      return { id: s.id, gr_number: s.gr_number, roll_number: s.roll_number, division: s.division, semester: s.semester, full_name: u?.full_name, email: u?.email, phone: u?.phone, is_active: u?.is_active, department_name: d?.name, department_code: d?.code };
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.full_name?.toLowerCase().includes(q) || s.gr_number?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q));
    }
    const total = list.length;
    const offset = (page - 1) * limit;
    return { students: list.slice(offset, offset + parseInt(limit)), total, page: parseInt(page), limit: parseInt(limit) };
  }

  // Scan all students (with optional department filter)
  const filterParts = [];
  const exprValues = {};
  if (department) {
    filterParts.push('department_id = :deptId');
    exprValues[':deptId'] = department;
  }

  let students = await scanItems('Students', {
    ...(filterParts.length ? { FilterExpression: filterParts.join(' AND ') } : {}),
    ...(Object.keys(exprValues).length ? { ExpressionAttributeValues: exprValues } : {}),
  });

  // Enrich with user and department data
  let enriched = [];
  for (const s of students) {
    let user = null;
    if (s.user_id) {
      user = await getItem('Users', { userId: s.user_id });
    }

    let dept = null;
    if (s.department_id) {
      dept = await getItem('Departments', { departmentId: s.department_id });
    }

    enriched.push({
      id: s.studentId,
      user_id: s.user_id,
      gr_number: s.gr_number,
      roll_number: s.roll_number,
      division: s.division,
      semester: s.semester,
      full_name: user?.full_name || 'N/A',
      email: user?.email || 'N/A',
      phone: user?.phone,
      is_active: user?.is_active,
      department_name: dept?.name || 'N/A',
      department_code: dept?.code,
      attendance_summary: s.attendance_summary || { overall_pct: 0, total_sessions: 0 },
    });
  }

  // Client-side search
  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(s =>
      s.full_name?.toLowerCase().includes(q) ||
      s.gr_number?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q)
    );
  }

  enriched.sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
  const total = enriched.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  return {
    students: enriched.slice(offset, offset + parseInt(limit)),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  };
}

async function getStudentDetail(studentId) {
  if (isMock()) {
    const mock = getMock();
    const s = mock.getStudent(studentId);
    if (!s) throw new AppError('Student not found', 404);
    const u = mock.getUser(s.user_id);
    const d = mock.getDept(s.department_id);
    const records = mock.store.attendance_records.filter(ar => ar.student_id === studentId);
    const present = records.filter(r => r.status === 'PRESENT_CONFIRMED').length;
    const absent = records.filter(r => r.status === 'ABSENT_CONFIRMED').length;
    return { ...s, full_name: u?.full_name, email: u?.email, department_name: d?.name, department_code: d?.code,
      attendance_summary: { total_sessions: records.length, present, absent, needs_review: records.length - present - absent, late_count: records.filter(r => r.late_flag).length, attendance_pct: records.length ? Math.round(present / records.length * 1000) / 10 : null }
    };
  }

  const student = await getItem('Students', { studentId });
  if (!student) throw new AppError('Student not found', 404);

  const user = await getItem('Users', { userId: student.user_id });
  const dept = await getItem('Departments', { departmentId: student.department_id });

  // Get attendance records for this student via GSI
  const records = await queryItems('AttendanceRecords', {
    IndexName: 'StudentIndex',
    KeyConditionExpression: 'student_id = :sid',
    ExpressionAttributeValues: { ':sid': studentId },
  });

  const present = records.filter(r => r.status === 'PRESENT_CONFIRMED').length;
  const absent = records.filter(r => r.status === 'ABSENT_CONFIRMED').length;
  const lateCount = records.filter(r => r.late_flag).length;
  const totalSessions = records.length;
  const pct = totalSessions ? Math.round(present / totalSessions * 1000) / 10 : null;

  return {
    id: student.studentId,
    gr_number: student.gr_number,
    roll_number: student.roll_number,
    division: student.division,
    semester: student.semester,
    user_id: student.user_id,
    department_id: student.department_id,
    full_name: user?.full_name,
    email: user?.email,
    phone: user?.phone,
    is_active: user?.is_active,
    department_name: dept?.name,
    department_code: dept?.code,
    attendance_summary: {
      total_sessions: totalSessions,
      present,
      absent,
      needs_review: totalSessions - present - absent,
      late_count: lateCount,
      attendance_pct: pct,
    },
  };
}

async function createStudent(data) {
  if (isMock()) {
    const mock = getMock();
    const newId = mock.uuid();
    const userId = mock.uuid();
    mock.store.users.push({
      id: userId, email: data.email || `s${Date.now()}@campuspulse.edu`, role: 'student',
      full_name: data.full_name, is_active: data.is_active !== false, password_hash: 'hash'
    });
    mock.store.students.push({ id: newId, user_id: userId, ...data });
    return { id: newId, ...data };
  }

  const studentId = uuidv4();
  const userId = uuidv4();
  const now = new Date().toISOString();

  // Create User first
  const password_hash = await bcrypt.hash('Password123!', 12);
  const user = {
    userId,
    email: data.email || `student_${Date.now()}@campuspulse.edu`,
    password_hash,
    role: 'student',
    full_name: data.full_name || 'Unknown Student',
    phone: null,
    is_active: data.is_active !== false,
    last_login: null,
    created_at: now,
    updated_at: now,
  };
  await putItem('Users', user);

  // Create Student
  const student = {
    studentId,
    user_id: userId,
    department_id: data.department_id || 'd0000000-0000-0000-0000-000000000001',
    gr_number: data.gr_number,
    roll_number: data.roll_number,
    division: data.division,
    semester: data.semester || 1,
    created_at: now,
    updated_at: now,
  };
  await putItem('Students', student);
  return { id: studentId, ...student, full_name: data.full_name, email: data.email };
}

async function updateStudent(id, data) {
  if (isMock()) {
    const mock = getMock();
    const idx = mock.store.students.findIndex(s => s.id === id);
    if (idx === -1) throw new AppError('Not found', 404);
    mock.store.students[idx] = { ...mock.store.students[idx], ...data };
    const uIdx = mock.store.users.findIndex(u => u.id === mock.store.students[idx].user_id);
    if (uIdx !== -1) {
      if (data.full_name) mock.store.users[uIdx].full_name = data.full_name;
      if (data.email) mock.store.users[uIdx].email = data.email;
      if (data.is_active !== undefined) mock.store.users[uIdx].is_active = data.is_active;
    }
    return mock.store.students[idx];
  }

  const existing = await getItem('Students', { studentId: id });
  if (!existing) throw new AppError('Student not found', 404);

  // Update User if needed
  if (data.full_name || data.email || data.is_active !== undefined) {
    const userUpdates = [];
    const userValues = { ':now': new Date().toISOString() };
    const userNames = {};
    let uIdx = 0;
    
    if (data.full_name) {
      userNames[`#uk${uIdx}`] = 'full_name';
      userValues[`:uval${uIdx}`] = data.full_name;
      userUpdates.push(`#uk${uIdx} = :uval${uIdx}`);
      uIdx++;
    }
    if (data.email) {
      userNames[`#uk${uIdx}`] = 'email';
      userValues[`:uval${uIdx}`] = data.email;
      userUpdates.push(`#uk${uIdx} = :uval${uIdx}`);
      uIdx++;
    }
    if (data.is_active !== undefined) {
      userNames[`#uk${uIdx}`] = 'is_active';
      userValues[`:uval${uIdx}`] = data.is_active;
      userUpdates.push(`#uk${uIdx} = :uval${uIdx}`);
      uIdx++;
    }
    
    if (userUpdates.length > 0) {
      userUpdates.push('updated_at = :now');
      await updateItem('Users', { userId: existing.user_id },
        `SET ${userUpdates.join(', ')}`,
        userValues,
        Object.keys(userNames).length ? userNames : undefined
      );
    }
  }

  // Update Student
  const studentData = { ...data };
  delete studentData.full_name;
  delete studentData.email;
  delete studentData.is_active;

  if (Object.keys(studentData).length === 0) {
    return { id, ...existing, ...data };
  }

  const updateParts = [];
  const exprValues = { ':now': new Date().toISOString() };
  const exprNames = {};
  let idx = 0;
  for (const [key, val] of Object.entries(studentData)) {
    const placeholder = `:val${idx}`;
    const nameKey = `#k${idx}`;
    exprNames[nameKey] = key;
    exprValues[placeholder] = val;
    updateParts.push(`${nameKey} = ${placeholder}`);
    idx++;
  }
  updateParts.push('updated_at = :now');

  const updated = await updateItem('Students', { studentId: id },
    `SET ${updateParts.join(', ')}`,
    exprValues,
    Object.keys(exprNames).length ? exprNames : undefined
  );
  return { id, ...updated, ...data };
}

async function deleteStudent(id) {
  if (isMock()) {
    const mock = getMock();
    mock.store.students = mock.store.students.filter(s => s.id !== id);
    return { success: true };
  }

  const deleted = await deleteItem('Students', { studentId: id });
  if (!deleted) throw new AppError('Student not found', 404);
  return { success: true };
}

module.exports = { listStudents, getStudentDetail, createStudent, updateStudent, deleteStudent };
