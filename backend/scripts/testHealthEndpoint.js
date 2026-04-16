#!/usr/bin/env node

/**
 * Test Health Endpoint
 * 
 * Simple script to test the /health endpoint
 * Usage: node scripts/testHealthEndpoint.js
 */

const http = require('http');

const PORT = process.env.PORT || 4000;
const HOST = 'localhost';

console.log('🔍 Testing health endpoint...\n');

const options = {
  hostname: HOST,
  port: PORT,
  path: '/health',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📦 Response Body: ${data}\n`);
    
    if (res.statusCode === 200) {
      console.log('✅ Health check passed! Ready for AWS ALB/Target Group');
    } else {
      console.log('❌ Health check failed!');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure the server is running: npm run dev');
  process.exit(1);
});

req.end();
