const { submitAttendance } = require('./src/modules/faculty/faculty.service');

async function testSubmit() {
  try {
    const res = await submitAttendance({
      sessionId: '91684ff6-71b3-4a7c-b949-dbb4d021a436', // Known session ID from earlier
      userId: '609e736b-dc47-462a-bea0-3393ac2dd40d', // Seema's User ID/Faculty ID mapping
      absentStudentIds: []
    });
    console.log("Success:", res);
  } catch(err) {
    console.error("Error submitting attendance:");
    console.error(err);
  }
}

testSubmit().then(() => process.exit(0));
