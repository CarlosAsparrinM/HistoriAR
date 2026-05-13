#!/usr/bin/env node
/**
 * Script para ejecutar todas las migraciones de base de datos
 * 
 * Uso: node scripts/runMigrations.js
 * 
 * Este script ejecuta las migraciones en orden:
 * 1. addLocationToInstitutions
 * 2. migrateQuizStructure
 * 3. legacy structure migration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const migrations = [
  {
    name: 'Add Location to Institutions',
    path: join(__dirname, '../src/migrations/addLocationToInstitutions.js')
  },
  {
    name: 'Migrate Quiz Structure',
    path: join(__dirname, '../src/migrations/migrateQuizStructure.js')
  },
  {
    name: 'Legacy structure migration',
    path: join(__dirname, '../src/migrations/migrateS3Structure.js')
  }
];

async function runMigration(migration) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${migration.name}`);
    console.log('='.repeat(60));
    
    const child = spawn('node', [migration.path], {
      stdio: 'inherit',
      env: process.env
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${migration.name} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${migration.name} failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runAllMigrations() {
  console.log('\n🚀 Starting database migrations...\n');
  console.log(`MongoDB URI: ${process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***@')}`);
  
  try {
    for (const migration of migrations) {
      await runMigration(migration);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ All migrations completed successfully!');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ Migration failed:', error.message);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Verificar que MONGODB_URI esté configurado
if (!process.env.MONGODB_URI) {
  console.error('✗ Error: MONGODB_URI environment variable is not set');
  console.error('Please configure your .env file with MONGODB_URI');
  process.exit(1);
}

runAllMigrations();
