require('./src/config/env.js');
const { getGateLogs } = require('./src/modules/admin/admin.service.js');
getGateLogs().then(d => process.stdout.write("OK\n")).catch(e => {
  require('fs').writeFileSync('clean_err.txt', e.stack);
  console.log("Wrote error");
});
