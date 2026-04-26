/**
 * Generates exact demo credentials for CampusPulse.
 * Run with: node src/db/seed-demo-users.js
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
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

async function put(table, item) {
  await docClient.send(new PutCommand({ TableName: T(table), Item: item }));
}

async function seed() {
  console.log('\n🔐 Seeding CampusPulse Demo Credentials...\n');
  
  // Exact hashing as expected by auth.service.js
  const hash = await bcrypt.hash('Password123!', 12);
  const now = new Date().toISOString();
  
  const users = [
    { email: 'admin@campuspulse.edu', role: 'admin', full_name: 'Admin User' },
    { email: 'faculty@campuspulse.edu', role: 'faculty', full_name: 'Faculty User' },
    { email: 'student@campuspulse.edu', role: 'student', full_name: 'Student User' },
    { email: 'guard@campuspulse.edu', role: 'guard', full_name: 'Guard User' },
  ];

  for (const u of users) {
    const item = {
      userId: uuidv4(),
      email: u.email,
      password_hash: hash,
      role: u.role,
      full_name: u.full_name,
      phone: null,
      is_active: true,
      last_login: null,
      created_at: now,
      updated_at: now,
    };
    await put('Users', item);
    console.log(`✅ Inserted ${u.role}: ${u.email} / Password123!`);
  }
  
  console.log('\n🎉 Done! You can now log in with these credentials.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
