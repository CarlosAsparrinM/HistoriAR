import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateEnvironment } from '../../src/config/validateEnv.js';

const originalEnv = { ...process.env };
const validEnv = {
  MONGODB_URI: 'mongodb://database/historiar',
  JWT_SECRET: 'a-strong-random-value-with-more-than-32-characters',
  JWT_EXPIRES_IN: '7d',
  AWS_REGION: 'us-east-1',
  S3_BUCKET: 'historiar-test',
  ALLOWED_ORIGINS: 'https://admin.example.com',
  PORT: '4000',
  TRUST_PROXY_HOPS: '1',
};

describe('validateEnvironment', () => {
  beforeEach(() => {
    process.env = { ...originalEnv, ...validEnv, NODE_ENV: 'production' };
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('acepta producción con rol IAM y sin credenciales estáticas', () => {
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('exige ambas credenciales AWS cuando se configura una', () => {
    process.env.AWS_ACCESS_KEY_ID = 'access-key';
    expect(() => validateEnvironment()).toThrow('Faltan variables');
  });

  it.each(['0', '65536', 'not-a-port'])('rechaza PORT inválido: %s', (port) => {
    process.env.PORT = port;
    expect(() => validateEnvironment()).toThrow('Faltan variables');
  });

  it('requiere orígenes CORS explícitos en producción', () => {
    delete process.env.ALLOWED_ORIGINS;
    expect(() => validateEnvironment()).toThrow('ALLOWED_ORIGINS');
  });
});
