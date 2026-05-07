const { getAlerts } = require('./src/modules/attendance/attendance.service');

async function test() {
  try {
    const alerts = await getAlerts({ resolved: undefined, limit: 50 });
    console.log("Alerts found:", alerts.length);
    console.log(JSON.stringify(alerts, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
test().then(() => process.exit(0));
