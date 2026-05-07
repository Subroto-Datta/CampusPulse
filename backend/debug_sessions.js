const { scanItems, getItem } = require('./src/config/db');

async function testSessions() {
  const users = await scanItems('Users');
  const seema = users.find(u => u.full_name?.toLowerCase().includes('seema'));
  if (!seema) return console.log("Seema not found in Users");

  const faculties = await scanItems('Faculty');
  const fac = faculties.find(f => f.user_id === seema.userId || f.user_id === seema.id);
  if (!fac) return console.log("Seema not found in Faculty table");

  console.log(`Seema Faculty ID:`, fac.id || fac.facultyId);

  const sessions = await scanItems('LectureSessions');
  const seemaSessions = sessions.filter(s => s.faculty_id === fac.id || s.faculty_id === fac.facultyId);
  
  const fs = require('fs');
  fs.writeFileSync('output.json', JSON.stringify({ count: seemaSessions.length, sessions: seemaSessions }, null, 2));
}

testSessions().then(() => process.exit(0)).catch(console.error);
