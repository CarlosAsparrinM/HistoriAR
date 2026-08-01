/**
 * Validate required environment variables
 * This should be called at application startup to ensure all required config is present
 */

const requiredEnvVars = {
  // Database
  MONGODB_URI: 'MongoDB connection string',
  
  // JWT
  JWT_SECRET: 'Secret key for JWT token signing',
  JWT_EXPIRES_IN: 'JWT token expiration time',
  
  // AWS S3
  AWS_ACCESS_KEY_ID: 'AWS IAM access key ID',
  AWS_SECRET_ACCESS_KEY: 'AWS IAM secret access key',
  AWS_REGION: 'AWS region for S3 bucket',
  S3_BUCKET: 'S3 bucket name for file storage',
};

const optionalEnvVars = {
  PORT: 'Server port (default: 4000)',
  NODE_ENV: 'Environment (development/production)',
  ALLOWED_ORIGINS: 'Comma-separated list of allowed CORS origins',
  TRUST_PROXY_HOPS: 'Number of trusted proxy hops in front of the Docker container',
  API_BASE_URL: 'Base URL of the API',
};

export function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[varName]) {
      missing.push(`${varName}: ${description}`);
    }
  }

  // Check optional but recommended variables
  for (const [varName, description] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      warnings.push(`${varName}: ${description}`);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(msg => console.error(`  - ${msg}`));
    console.error('\nPlease set these variables in your .env file or environment.\n');
    process.exit(1);
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  Optional environment variables not set:\n');
    warnings.forEach(msg => console.warn(`  - ${msg}`));
    console.warn('\nUsing default values where applicable.\n');
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      console.error('\n❌ JWT_SECRET is too short for production!');
      console.error('   It should be at least 32 characters long.\n');
      process.exit(1);
    }
    
    // Check for common weak secrets
    const weakSecrets = ['secret', 'password', 'changeme', 'test', 'dev'];
    if (weakSecrets.some(weak => jwtSecret.toLowerCase().includes(weak))) {
      console.error('\n❌ JWT_SECRET appears to be a weak/default value!');
      console.error('   Please use a strong, random secret in production.\n');
      process.exit(1);
    }
  }

  console.log('✅ Environment variables validated successfully\n');
}

export default validateEnvironment;
