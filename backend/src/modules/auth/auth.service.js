const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, updateItem, scanItems, queryItems, isMock } = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const SALT_ROUNDS = 12;

function getMock() { return require('../../config/mockDb'); }

async function register({ email, password, role, full_name, phone }) {
  if (isMock()) {
    const mock = getMock();
    if (mock.store.users.find(u => u.email === email)) throw new AppError('Email already registered', 409);
    const id = mock.uuid();
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = { id, email, password_hash, role, full_name, phone: phone || null, is_active: true, last_login: null };
    mock.store.users.push(user);
    const token = signToken(user);
    return { user: { id, email, role, full_name }, token };
  }

  // Check if email already exists via GSI
  const existing = await queryItems('Users', {
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  });
  if (existing.length) throw new AppError('Email already registered', 409);

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const user = {
    userId: id,
    email,
    password_hash,
    role,
    full_name,
    phone: phone || null,
    is_active: true,
    last_login: null,
    created_at: now,
    updated_at: now,
  };
  await putItem('Users', user);
  return { user: { id, email, role, full_name }, token: signToken({ id, email, role, full_name }) };
}

async function login({ email, password }) {
  email = (email || '').trim().toLowerCase();
  if (isMock()) {
    const mock = getMock();
    const user = mock.store.users.find(u => u.email === email);
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.is_active) throw new AppError('Account is deactivated', 403);
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid email or password', 401);
    user.last_login = new Date().toISOString();
    const token = signToken(user);
    return { user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name }, token };
  }

  // Lookup user by email via GSI
  const users = await queryItems('Users', {
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  });
  console.log('[AuthService] Lookup result for:', email, users.length ? 'Found' : 'Not Found');
  if (!users.length) throw new AppError('Invalid email or password', 401);
  const user = users[0];
  if (!user.is_active) throw new AppError('Account is deactivated', 403);
  const valid = await bcrypt.compare(password, user.password_hash);
  console.log('[AuthService] Password validation:', valid ? 'Passed' : 'Failed');
  if (!valid) throw new AppError('Invalid email or password', 401);

  // Update last_login
  await updateItem('Users', { userId: user.userId },
    'SET last_login = :now, updated_at = :now',
    { ':now': new Date().toISOString() }
  );

  return {
    user: { id: user.userId, email: user.email, role: user.role, full_name: user.full_name },
    token: signToken({ id: user.userId, email: user.email, role: user.role, full_name: user.full_name }),
  };
}

async function me(userId) {
  if (isMock()) {
    const mock = getMock();
    const u = mock.getUser(userId);
    if (!u) throw new AppError('User not found', 404);
    const s = mock.store.students.find(st => st.user_id === userId);
    const f = mock.store.faculty.find(fa => fa.user_id === userId);
    const dept = mock.getDept(s?.department_id || f?.department_id);
    return {
      id: u.id, email: u.email, role: u.role, full_name: u.full_name, phone: u.phone, is_active: u.is_active, last_login: u.last_login,
      student_id: s?.id || null, gr_number: s?.gr_number || null, roll_number: s?.roll_number || null, division: s?.division || null, semester: s?.semester || null,
      faculty_id: f?.id || null, employee_id: f?.employee_id || null, designation: f?.designation || null,
      department_name: dept?.name || null, department_code: dept?.code || null,
    };
  }

  const user = await getItem('Users', { userId });
  if (!user) throw new AppError('User not found', 404);

  // Look up student / faculty records
  const students = await queryItems('Students', {
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });
  const faculties = await queryItems('Faculty', {
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });

  const s = students[0] || null;
  const f = faculties[0] || null;

  let dept = null;
  const deptId = s?.department_id || f?.department_id;
  if (deptId) {
    dept = await getItem('Departments', { departmentId: deptId });
  }

  return {
    id: user.id, email: user.email, role: user.role, full_name: user.full_name,
    phone: user.phone, is_active: user.is_active, last_login: user.last_login,
    student_id: s?.id || null, gr_number: s?.gr_number || null,
    roll_number: s?.roll_number || null, division: s?.division || null, semester: s?.semester || null,
    faculty_id: f?.id || null, employee_id: f?.employee_id || null, designation: f?.designation || null,
    department_name: dept?.name || null, department_code: dept?.code || null,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

module.exports = { register, login, me };
