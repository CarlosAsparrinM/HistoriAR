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

  const hasAccessKey = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(process.env.AWS_SECRET_ACCESS_KEY);
  if (hasAccessKey !== hasSecretKey) {
    missing.push('AWS credentials: configure both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither when using an IAM role');
  }

  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    missing.push('PORT: debe ser un entero entre 1 y 65535');
  }

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    missing.push('TRUST_PROXY_HOPS: debe ser un entero mayor o igual a cero');
  }

  // Report results
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach(msg => console.error(`  - ${msg}`));
    console.error('\nPlease set these variables in your .env file or environment.\n');
    throw new Error('Faltan variables de entorno requeridas');
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  Optional environment variables not set:\n');
    warnings.forEach(msg => console.warn(`  - ${msg}`));
    console.warn('\nUsing default values where applicable.\n');
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      throw new Error('ALLOWED_ORIGINS es obligatorio en producción');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      console.error('\n❌ JWT_SECRET is too short for production!');
      console.error('   It should be at least 32 characters long.\n');
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
    
    // Check for common weak secrets
    const weakSecrets = ['secret', 'password', 'changeme', 'test', 'dev'];
    if (weakSecrets.some(weak => jwtSecret.toLowerCase().includes(weak))) {
      console.error('\n❌ JWT_SECRET appears to be a weak/default value!');
      console.error('   Please use a strong, random secret in production.\n');
      throw new Error('JWT_SECRET usa un valor débil o predeterminado');
    }
  }

  console.log('✅ Environment variables validated successfully\n');
}

export default validateEnvironment;
