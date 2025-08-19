#!/usr/bin/env node

// Railway-specific startup script
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting FleetTracker for Railway...');

// Start the backend server
const backendProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle process events
backendProcess.on('error', (error) => {
  console.error('❌ Backend process error:', error);
  process.exit(1);
});

backendProcess.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  backendProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  backendProcess.kill('SIGINT');
});

// Keep this process alive
setInterval(() => {
  console.log('💓 Railway startup script keep-alive ping');
}, 60000); // Every minute
