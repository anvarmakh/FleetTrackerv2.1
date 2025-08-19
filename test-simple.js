// Simple test for Railway deployment
const https = require('https');

console.log('Testing Railway deployment...');
console.log('URL: https://fleettrackerv21-production.up.railway.app/api/health');

const req = https.request('https://fleettrackerv21-production.up.railway.app/api/health', (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
