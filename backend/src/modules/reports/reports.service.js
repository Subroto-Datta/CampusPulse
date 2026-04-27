const { isMock, queryItems, scanItems, getItem } = require('../../config/db');

function getMock() { return require('../../config/mockDb'); }

async function dailyAttendanceTrend(days = 30) {
  if (isMock()) {
    // Generate realistic 30-day trend with weekends having no sessions
    const trend = [];
    const today = new Date();
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = d.getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) continue; // skip weekends
      const date = d.toISOString().slice(0, 10);
      const total = 9; // 3 students x 3 courses
      // Vary attendance by a realistic pattern
      const basePresent = 7;
      const noise = Math.floor(Math.sin(i) * 1.5); // deterministic variation
      const present = Math.max(4, Math.min(total, basePresent + noise));
      trend.push({ session_date: date, total, present, pct: Math.round(present / total * 1000) / 10 });
    }
    return trend;
  }

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Get all sessions in the date range
  const sessions = await scanItems('LectureSessions', {
    FilterExpression: 'session_date >= :since',
    ExpressionAttributeValues: { ':since': sinceDate },
  });

  // Group by date and compute attendance %
  const dateMap = {};
  for (const session of sessions) {
    const records = await queryItems('AttendanceRecords', {
      KeyConditionExpression: 'session_id = :sid',
      ExpressionAttributeValues: { ':sid': session.sessionId },
    });

    if (!dateMap[session.session_date]) {
      dateMap[session.session_date] = { total: 0, present: 0 };
    }
    dateMap[session.session_date].total += records.length;
    dateMap[session.session_date].present += records.filter(r => r.status === 'PRESENT_CONFIRMED').length;
  }

  return Object.entries(dateMap)
    .map(([date, { total, present }]) => ({
      session_date: date,
      total,
      present,
      pct: total > 0 ? Math.round(present / total * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
}

async function subjectWiseAttendance() {
  if (isMock()) {
    // Mirror the 3 mockDb courses with realistic attendance numbers
    return [
      { code: 'CS301', course_name: 'Data Structures',   total_records: 27, present: 24, attendance_pct: 88.9 },
      { code: 'CS302', course_name: 'Operating Systems', total_records: 27, present: 21, attendance_pct: 77.8 },
      { code: 'CS303', course_name: 'Database Systems',  total_records: 27, present: 18, attendance_pct: 66.7 },
    ];
  }

  const courses = await scanItems('Courses');
  const results = [];

  for (const course of courses) {
    // Get all sessions for this course
    const sessions = await queryItems('LectureSessions', {
      IndexName: 'CourseIndex',
      KeyConditionExpression: 'course_id = :cid',
      ExpressionAttributeValues: { ':cid': course.courseId },
    });

    let totalRecords = 0, present = 0;
    for (const session of sessions) {
      const records = await queryItems('AttendanceRecords', {
        KeyConditionExpression: 'session_id = :sid',
        ExpressionAttributeValues: { ':sid': session.sessionId },
      });
      totalRecords += records.length;
      present += records.filter(r => r.status === 'PRESENT_CONFIRMED').length;
    }

    if (totalRecords > 0) {
      results.push({
        code: course.code,
        course_name: course.name,
        total_records: totalRecords,
        present,
        attendance_pct: Math.round(present / totalRecords * 1000) / 10,
      });
    }
  }

  results.sort((a, b) => a.attendance_pct - b.attendance_pct);
  return results;
}

async function lowAttendanceStudents() {
  if (isMock()) {
    // Database Systems has < 75% => student3 (Rahul Mehta) falls below threshold
    return [
      {
        id: 's0000000-0000-0000-0000-000000000003',
        gr_number: 'GR2024003',
        roll_number: '103',
        division: 'A',
        full_name: 'Rahul Mehta',
        dept_code: 'CS',
        total_sessions: 27,
        present: 18,
        attendance_pct: 66.7,
      },
    ];
  }

  const students = await scanItems('Students');
  const results = [];

  for (const student of students) {
    const records = await queryItems('AttendanceRecords', {
      IndexName: 'StudentIndex',
      KeyConditionExpression: 'student_id = :sid',
      ExpressionAttributeValues: { ':sid': student.studentId },
    });

    if (records.length === 0) continue;

    const present = records.filter(r => r.status === 'PRESENT_CONFIRMED').length;
    const pct = Math.round(present / records.length * 1000) / 10;

    if (pct < 75) {
      const user = await getItem('Users', { userId: student.user_id });
      const dept = await getItem('Departments', { departmentId: student.department_id });
      results.push({
        id: student.studentId,
        gr_number: student.gr_number,
        roll_number: student.roll_number,
        division: student.division,
        full_name: user?.full_name,
        dept_code: dept?.code,
        total_sessions: records.length,
        present,
        attendance_pct: pct,
      });
    }
  }

  results.sort((a, b) => a.attendance_pct - b.attendance_pct);
  return results;
}

async function bunkSuspects(days = 7) {
  if (isMock()) {
    return [
      { id: 's0000000-0000-0000-0000-000000000003', gr_number: 'GR2024003', roll_number: '103', full_name: 'Rahul Mehta',  bunk_count: 3 },
      { id: 's0000000-0000-0000-0000-000000000002', gr_number: 'GR2024002', roll_number: '102', full_name: 'Priya Desai',  bunk_count: 1 },
    ];
  }

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const alerts = await scanItems('Alerts', {
    FilterExpression: 'alert_type = :atype AND created_at >= :since',
    ExpressionAttributeValues: { ':atype': 'ENTERED_BUT_ABSENT', ':since': sinceDate },
  });

  // Group by student
  const studentMap = {};
  for (const a of alerts) {
    if (!studentMap[a.student_id]) studentMap[a.student_id] = 0;
    studentMap[a.student_id]++;
  }

  const results = [];
  for (const [studentId, bunkCount] of Object.entries(studentMap)) {
    const student = await getItem('Students', { studentId });
    const user = student ? await getItem('Users', { userId: student.user_id }) : null;
    results.push({
      id: studentId,
      gr_number: student?.gr_number,
      roll_number: student?.roll_number,
      full_name: user?.full_name,
      bunk_count: bunkCount,
    });
  }

  results.sort((a, b) => b.bunk_count - a.bunk_count);
  return results;
}

async function lateArrivals(days = 7) {
  if (isMock()) {
    return [
      { id: 's0000000-0000-0000-0000-000000000002', gr_number: 'GR2024002', roll_number: '102', full_name: 'Priya Desai',  late_count: 4 },
      { id: 's0000000-0000-0000-0000-000000000001', gr_number: 'GR2024001', roll_number: '101', full_name: 'Aarav Patel',  late_count: 2 },
    ];
  }

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Scan attendance records with late_flag
  const lateRecords = await scanItems('AttendanceRecords', {
    FilterExpression: 'late_flag = :lt AND created_at >= :since',
    ExpressionAttributeValues: { ':lt': true, ':since': sinceDate },
  });

  // Group by student
  const studentMap = {};
  for (const r of lateRecords) {
    if (!studentMap[r.student_id]) studentMap[r.student_id] = 0;
    studentMap[r.student_id]++;
  }

  const results = [];
  for (const [studentId, lateCount] of Object.entries(studentMap)) {
    const student = await getItem('Students', { studentId });
    const user = student ? await getItem('Users', { userId: student.user_id }) : null;
    results.push({
      id: studentId,
      gr_number: student?.gr_number,
      roll_number: student?.roll_number,
      full_name: user?.full_name,
      late_count: lateCount,
    });
  }

  results.sort((a, b) => b.late_count - a.late_count);
  return results;
}

async function overallAttendance() {
  if (isMock()) {
    const mock = getMock();
    return mock.store.students.map(s => {
      const u = mock.getUser(s.user_id);
      const total = 27; // 9 sessions per course x 3 courses
      const present = s.id === 's0000000-0000-0000-0000-000000000003' ? 18 : 24; 
      return {
        id: s.id,
        gr_number: s.gr_number,
        roll_number: s.roll_number,
        full_name: u?.full_name,
        division: s.division,
        total_sessions: total,
        present_count: present,
        attendance_pct: Math.round(present / total * 1000) / 10
      };
    });
  }

  const students = await scanItems('Students');
  const results = [];

  for (const student of students) {
    const records = await queryItems('AttendanceRecords', {
      IndexName: 'StudentIndex',
      KeyConditionExpression: 'student_id = :sid',
      ExpressionAttributeValues: { ':sid': student.studentId },
    });

    const present = records.filter(r => ['PRESENT_CONFIRMED', 'LATE_PRESENT', 'MANUAL_PRESENT'].includes(r.status)).length;
    const user = await getItem('Users', { userId: student.user_id });

    results.push({
      id: student.studentId,
      gr_number: student.gr_number,
      roll_number: student.roll_number,
      full_name: user?.full_name || 'N/A',
      division: student.division,
      total_sessions: records.length,
      present_count: present,
      attendance_pct: records.length > 0 ? Math.round(present / records.length * 1000) / 10 : 0,
    });
  }

  results.sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
  return results;
}

module.exports = { dailyAttendanceTrend, subjectWiseAttendance, lowAttendanceStudents, bunkSuspects, lateArrivals, overallAttendance };

