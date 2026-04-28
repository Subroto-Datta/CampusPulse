const app = require('./app');
const env = require('./config/env');

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`\n🚀  CampusPulse API running → http://localhost:${PORT}`);
  console.log(`   Environment : ${env.nodeEnv}`);
  
  const dbType = env.dbType === 'supabase' ? 'Supabase' : 'DynamoDB';
  const dbStatus = process.env.DB_MOCK === 'true' ? 'MOCK (In-Memory)' : 'ACTIVE';
  console.log(`   Database    : ${dbType} [${dbStatus}]\n`);
});

module.exports = app;

