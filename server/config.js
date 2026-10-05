const path = require('path');

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'silversaas-ultra-secure-metallic-token-key-2026',
  JWT_EXPIRES_IN_HOURS: 24,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'silversaas.sqlite'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  CLOUD: {
    DEFAULT_PROVIDER: 'AWS S3',
    DEFAULT_REGION: 'us-east-1',
    REGIONS: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    BUCKET_PREFIX: 'silversaas-cloud-store'
  }
};
