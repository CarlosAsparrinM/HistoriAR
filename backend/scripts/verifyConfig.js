#!/usr/bin/env node
/**
 * Script para verificar configuración del entorno
 * 
 * Uso: node scripts/verifyConfig.js
 * 
 * Verifica que todas las variables de entorno necesarias estén configuradas
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { verifyS3Connection } from '../src/config/s3.js';
import { validateEnvironment } from '../src/config/validateEnv.js';

dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'AWS_REGION',
  'S3_BUCKET'
];

const optionalEnvVars = [
  'NODE_ENV',
  'PORT',
  'ALLOWED_ORIGINS',
  'TRUST_PROXY_HOPS',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

async function verifyConfig() {
  console.log('\n🔍 Verifying environment configuration...\n');

  try {
    validateEnvironment();
  } catch (error) {
    console.error(`Configuration validation failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  
  let hasErrors = false;
  let hasWarnings = false;

  // Verificar variables requeridas
  console.log('Required Environment Variables:');
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      console.error(`  ✗ ${varName}: MISSING`);
      hasErrors = true;
    } else {
      // Ocultar valores sensibles
      const displayValue = ['JWT_SECRET', 'MONGODB_URI', 'AWS_SECRET_ACCESS_KEY'].includes(varName) 
        ? '***' 
        : value;
      console.log(`  ✓ ${varName}: ${displayValue}`);
    }
  }

  // Verificar variables opcionales
  console.log('\nOptional Environment Variables:');
  for (const varName of optionalEnvVars) {
    const value = process.env[varName];
    if (!value) {
      console.warn(`  ⚠ ${varName}: Not set (using default)`);
      hasWarnings = true;
    } else {
      console.log(`  ✓ ${varName}: ${value}`);
    }
  }

  // Verificar conexión a MongoDB
  console.log('\n📊 Testing MongoDB Connection:');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('  ✓ MongoDB connection successful');
    await mongoose.connection.close();
  } catch (error) {
    console.error('  ✗ MongoDB connection failed:', error.message);
    hasErrors = true;
  }

  // Verificar acceso a AWS S3
  console.log('\n☁️  Testing AWS S3:');
  try {
    await verifyS3Connection();
    console.log(`  ✓ S3 bucket '${process.env.S3_BUCKET}' is accessible`);
    console.log(`  ✓ AWS Region: ${process.env.AWS_REGION}`);
  } catch (error) {
    console.error('  ✗ S3 connection failed:', error.message);
    hasErrors = true;
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.error('✗ Configuration verification FAILED');
    console.error('Please fix the errors above before deploying');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.warn('⚠ Configuration verification completed with warnings');
    console.warn('Review the warnings above');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    console.log('✓ Configuration verification PASSED');
    console.log('All required configurations are set correctly');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  }
}

verifyConfig();
