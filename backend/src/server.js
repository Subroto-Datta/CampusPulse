const app = require('./app');
const env = require('./config/env');

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`\n🚀  CampusPulse API running → http://localhost:${PORT}`);
  console.log(`   Environment : ${env.nodeEnv}`);
  const dbInfo = process.env.DB_MOCK === 'true' ? 'mock (in-memory)' : `DynamoDB (${env.aws.region})`;
  console.log(`   Database    : ${dbInfo}\n`);
});
