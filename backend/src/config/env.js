const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  dbType: process.env.DB_TYPE || 'dynamodb',
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  dynamodb: {
    tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || 'CampusPulse_',
    endpoint: process.env.DYNAMODB_ENDPOINT || '',  // e.g. http://localhost:8000 for local dev
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET || 'campuspulse-uploads',
    region: process.env.AWS_REGION || 'ap-south-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || '',
  },
};
