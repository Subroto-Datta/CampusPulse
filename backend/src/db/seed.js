/**
 * Seed DynamoDB tables with initial demo data.
 * Usage: npm run seed
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'CampusPulse_';
const T = (name) => `${PREFIX}${name}`;
const HASH = bcrypt.hashSync('Password123!', 10);
const now = new Date().toISOString();
const today = now.slice(0, 10);

async function put(table, item) {
  await docClient.send(new PutCommand({ TableName: T(table), Item: item }));
}

async function seed() {
  console.log('\n🌱 Seeding DynamoDB...\n');

  // ─── Departments ───────────────────────────────
  const depts = [
    { departmentId: 'd0000000-0000-0000-0000-000000000001', name: 'Computer Science', code: 'CS', created_at: now, updated_at: now },
    { departmentId: 'd0000000-0000-0000-0000-000000000002', name: 'Electronics', code: 'EC', created_at: now, updated_at: now },
  ];
  for (const d of depts) { await put('Departments', d); console.log(`  → Department: ${d.name}`); }

  // ─── Users ─────────────────────────────────────
  const users = [
    { userId: 'u0000000-0000-0000-0000-000000000001', email: 'admin@campuspulse.edu', password_hash: HASH, role: 'admin', full_name: 'Dr. Admin Singh', phone: '9876543210', is_active: true, last_login: null, created_at: now, updated_at: now },
    { userId: 'u0000000-0000-0000-0000-000000000002', email: 'guard@campuspulse.edu', password_hash: HASH, role: 'guard', full_name: 'Ramesh Guard', phone: '9876543211', is_active: true, last_login: null, created_at: now, updated_at: now },
    { userId: 'u0000000-0000-0000-0000-000000000010', email: 'faculty1@campuspulse.edu', password_hash: HASH, role: 'faculty', full_name: 'Prof. Meera Sharma', phone: '9876543220', is_active: true, last_login: null, created_at: now, updated_at: now },
    { userId: 'u0000000-0000-0000-0000-000000000020', email: 'student1@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Aarav Patel', phone: '9876543230', is_active: true, last_login: null, created_at: now, updated_at: now },
    { userId: 'u0000000-0000-0000-0000-000000000021', email: 'student2@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Priya Desai', phone: '9876543231', is_active: true, last_login: null, created_at: now, updated_at: now },
    { userId: 'u0000000-0000-0000-0000-000000000022', email: 'student3@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Rahul Mehta', phone: '9876543232', is_active: true, last_login: null, created_at: now, updated_at: now },
  ];
  for (const u of users) { await put('Users', u); console.log(`  → User: ${u.full_name} (${u.role})`); }

  // ─── Students ──────────────────────────────────
  const students = [
    { studentId: 's0000000-0000-0000-0000-000000000001', user_id: 'u0000000-0000-0000-0000-000000000020', gr_number: 'GR2024001', roll_number: '101', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024, created_at: now, updated_at: now },
    { studentId: 's0000000-0000-0000-0000-000000000002', user_id: 'u0000000-0000-0000-0000-000000000021', gr_number: 'GR2024002', roll_number: '102', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024, created_at: now, updated_at: now },
    { studentId: 's0000000-0000-0000-0000-000000000003', user_id: 'u0000000-0000-0000-0000-000000000022', gr_number: 'GR2024003', roll_number: '103', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024, created_at: now, updated_at: now },
  ];
  for (const s of students) { await put('Students', s); console.log(`  → Student: ${s.gr_number}`); }

  // ─── Faculty ───────────────────────────────────
  const faculty = [
    { facultyId: 'f0000000-0000-0000-0000-000000000001', user_id: 'u0000000-0000-0000-0000-000000000010', employee_id: 'FAC001', department_id: 'd0000000-0000-0000-0000-000000000001', designation: 'Associate Professor', created_at: now, updated_at: now },
  ];
  for (const f of faculty) { await put('Faculty', f); console.log(`  → Faculty: ${f.employee_id}`); }

  // ─── Courses ───────────────────────────────────
  const courses = [
    { courseId: 'c0000000-0000-0000-0000-000000000001', name: 'Data Structures', code: 'CS301', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 4, created_at: now, updated_at: now },
    { courseId: 'c0000000-0000-0000-0000-000000000002', name: 'Operating Systems', code: 'CS302', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 3, created_at: now, updated_at: now },
    { courseId: 'c0000000-0000-0000-0000-000000000003', name: 'Database Systems', code: 'CS303', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 3, created_at: now, updated_at: now },
  ];
  for (const c of courses) { await put('Courses', c); console.log(`  → Course: ${c.code} — ${c.name}`); }

  // ─── Enrollments ───────────────────────────────
  const studentIds = students.map(s => s.studentId);
  const courseIds = courses.map(c => c.courseId);
  for (const sid of studentIds) {
    for (const cid of courseIds) {
      await put('Enrollments', { student_id: sid, course_id: cid, academic_year: '2025-26', created_at: now });
    }
  }
  console.log(`  → Enrollments: ${studentIds.length * courseIds.length} created`);

  // ─── RFID Cards ────────────────────────────────
  const rfids = [
    { cardId: 'rc000001', rfid_uid: 'RFID-A1B2C3D4', student_id: 's0000000-0000-0000-0000-000000000001', is_active: true, issued_at: now, created_at: now, updated_at: now },
    { cardId: 'rc000002', rfid_uid: 'RFID-E5F6G7H8', student_id: 's0000000-0000-0000-0000-000000000002', is_active: true, issued_at: now, created_at: now, updated_at: now },
    { cardId: 'rc000003', rfid_uid: 'RFID-I9J0K1L2', student_id: 's0000000-0000-0000-0000-000000000003', is_active: true, issued_at: now, created_at: now, updated_at: now },
  ];
  for (const r of rfids) { await put('RfidCards', r); console.log(`  → RFID: ${r.rfid_uid}`); }

  // ─── Lecture Sessions (today) ──────────────────
  const sessions = [
    { sessionId: 'ls000001', course_id: 'c0000000-0000-0000-0000-000000000001', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '09:00:00', end_time: '10:00:00', is_completed: false, created_at: now, updated_at: now },
    { sessionId: 'ls000002', course_id: 'c0000000-0000-0000-0000-000000000002', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '10:15:00', end_time: '11:15:00', is_completed: false, created_at: now, updated_at: now },
    { sessionId: 'ls000003', course_id: 'c0000000-0000-0000-0000-000000000003', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '11:30:00', end_time: '12:30:00', is_completed: false, created_at: now, updated_at: now },
  ];
  for (const s of sessions) { await put('LectureSessions', s); console.log(`  → Session: ${s.sessionId} on ${s.session_date}`); }

  console.log('\n✅ Seed complete.\n');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
