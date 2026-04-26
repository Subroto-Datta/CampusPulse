/**
 * In-memory mock database for running without PostgreSQL.
 * Supports all CampusPulse queries via pattern matching.
 */
const bcrypt = require('bcryptjs');

// Pre-hashed password for "Password123!"
const HASH = bcrypt.hashSync('Password123!', 10);

// ─── In-memory tables ──────────────────────────────────
const departments = [
  { id: 'd0000000-0000-0000-0000-000000000001', name: 'Computer Science', code: 'CS' },
  { id: 'd0000000-0000-0000-0000-000000000002', name: 'Electronics', code: 'EC' },
];

const users = [
  { id: 'u0000000-0000-0000-0000-000000000001', email: 'admin@campuspulse.edu', password_hash: HASH, role: 'admin', full_name: 'Dr. Admin Singh', phone: '9876543210', is_active: true, last_login: null },
  { id: 'u0000000-0000-0000-0000-000000000002', email: 'guard@campuspulse.edu', password_hash: HASH, role: 'guard', full_name: 'Ramesh Guard', phone: '9876543211', is_active: true, last_login: null },
  { id: 'u0000000-0000-0000-0000-000000000010', email: 'faculty1@campuspulse.edu', password_hash: HASH, role: 'faculty', full_name: 'Prof. Meera Sharma', phone: '9876543220', is_active: true, last_login: null },
  { id: 'u0000000-0000-0000-0000-000000000020', email: 'student1@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Aarav Patel', phone: '9876543230', is_active: true, last_login: null },
  { id: 'u0000000-0000-0000-0000-000000000021', email: 'student2@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Priya Desai', phone: '9876543231', is_active: true, last_login: null },
  { id: 'u0000000-0000-0000-0000-000000000022', email: 'student3@campuspulse.edu', password_hash: HASH, role: 'student', full_name: 'Rahul Mehta', phone: '9876543232', is_active: true, last_login: null },
];

const students = [
  { id: 's0000000-0000-0000-0000-000000000001', user_id: 'u0000000-0000-0000-0000-000000000020', gr_number: 'GR2024001', roll_number: '101', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024 },
  { id: 's0000000-0000-0000-0000-000000000002', user_id: 'u0000000-0000-0000-0000-000000000021', gr_number: 'GR2024002', roll_number: '102', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024 },
  { id: 's0000000-0000-0000-0000-000000000003', user_id: 'u0000000-0000-0000-0000-000000000022', gr_number: 'GR2024003', roll_number: '103', division: 'A', semester: 4, department_id: 'd0000000-0000-0000-0000-000000000001', admission_year: 2024 },
];

const faculty = [
  { id: 'f0000000-0000-0000-0000-000000000001', user_id: 'u0000000-0000-0000-0000-000000000010', employee_id: 'FAC001', department_id: 'd0000000-0000-0000-0000-000000000001', designation: 'Associate Professor' },
];

const courses = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Data Structures', code: 'CS301', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 4 },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Operating Systems', code: 'CS302', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 3 },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Database Systems', code: 'CS303', department_id: 'd0000000-0000-0000-0000-000000000001', semester: 4, credits: 3 },
];

const enrollments = [
  { student_id: 's0000000-0000-0000-0000-000000000001', course_id: 'c0000000-0000-0000-0000-000000000001' },
  { student_id: 's0000000-0000-0000-0000-000000000001', course_id: 'c0000000-0000-0000-0000-000000000002' },
  { student_id: 's0000000-0000-0000-0000-000000000001', course_id: 'c0000000-0000-0000-0000-000000000003' },
  { student_id: 's0000000-0000-0000-0000-000000000002', course_id: 'c0000000-0000-0000-0000-000000000001' },
  { student_id: 's0000000-0000-0000-0000-000000000002', course_id: 'c0000000-0000-0000-0000-000000000002' },
  { student_id: 's0000000-0000-0000-0000-000000000002', course_id: 'c0000000-0000-0000-0000-000000000003' },
  { student_id: 's0000000-0000-0000-0000-000000000003', course_id: 'c0000000-0000-0000-0000-000000000001' },
  { student_id: 's0000000-0000-0000-0000-000000000003', course_id: 'c0000000-0000-0000-0000-000000000002' },
  { student_id: 's0000000-0000-0000-0000-000000000003', course_id: 'c0000000-0000-0000-0000-000000000003' },
];

const rfid_cards = [
  { id: 'rc000001', rfid_uid: 'RFID-A1B2C3D4', student_id: 's0000000-0000-0000-0000-000000000001', is_active: true, issued_at: new Date().toISOString() },
  { id: 'rc000002', rfid_uid: 'RFID-E5F6G7H8', student_id: 's0000000-0000-0000-0000-000000000002', is_active: true, issued_at: new Date().toISOString() },
  { id: 'rc000003', rfid_uid: 'RFID-I9J0K1L2', student_id: 's0000000-0000-0000-0000-000000000003', is_active: true, issued_at: new Date().toISOString() },
];

const today = new Date().toISOString().slice(0, 10);
const lecture_sessions = [
  { id: 'ls000001', course_id: 'c0000000-0000-0000-0000-000000000001', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '09:00:00', end_time: '10:00:00', is_completed: false },
  { id: 'ls000002', course_id: 'c0000000-0000-0000-0000-000000000002', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '10:15:00', end_time: '11:15:00', is_completed: false },
  { id: 'ls000003', course_id: 'c0000000-0000-0000-0000-000000000003', faculty_id: 'f0000000-0000-0000-0000-000000000001', division: 'A', session_date: today, start_time: '11:30:00', end_time: '12:30:00', is_completed: false },
];

const gate_logs = [];
const attendance_records = [];
const qr_tokens = [];
const alerts = [];

// ─── Helpers ───────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getStudent(id) { return students.find(s => s.id === id); }
function getUser(id) { return users.find(u => u.id === id); }
function getDept(id) { return departments.find(d => d.id === id); }
function getCourse(id) { return courses.find(c => c.id === id); }
function getFacultyByUserId(uid) { return faculty.find(f => f.user_id === uid); }

// ─── Mock query engine ──────────────────────────
const store = { users, students, faculty, departments, courses, enrollments, rfid_cards, gate_logs, lecture_sessions, attendance_records, qr_tokens, alerts };

module.exports = { store, uuid, getStudent, getUser, getDept, getCourse, getFacultyByUserId };
