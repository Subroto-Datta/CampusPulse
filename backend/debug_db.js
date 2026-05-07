const { scanItems, getItem } = require('./src/config/db');
require('dotenv').config();

async function debug() {
  try {
    const students = await scanItems('Students');
    console.log('Total Students in DB:', students.length);
    if (students.length > 0) {
      console.log('Sample Student Division:', students[0].division);
      console.log('Sample Student Semester:', students[0].semester);
      console.log('Sample Student Semester Type:', typeof students[0].semester);
    }

    const courses = await scanItems('Courses');
    console.log('Total Courses in DB:', courses.length);

    const sessions = await scanItems('LectureSessions');
    console.log('Total Sessions in DB:', sessions.length);
    if (sessions.length > 0) {
        console.log('Sample Session Division:', sessions[0].division);
    }
  } catch (err) {
    console.error(err);
  }
}

debug();
