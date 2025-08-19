// Comprehensive Railway deployment test
const https = require('https');

const baseUrl = 'https://fleettrackerv21-production.up.railway.app';

const endpoints = [
  '/health',
  '/api/health',
  '/api/test',
  '/'
];

console.log('🔍 Testing Railway deployment...');
console.log(`Base URL: ${baseUrl}`);
console.log('');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${path}`;
    console.log(`Testing: ${url}`);
    
    const req = https.request(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.log(`  Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        console.log('');
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.log(`  Error: ${e.message}`);
      console.log('');
      resolve({ status: 'ERROR', error: e.message });
    });

    req.setTimeout(10000, () => {
      console.log('  Timeout after 10 seconds');
      console.log('');
      req.destroy();
      resolve({ status: 'TIMEOUT' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting comprehensive tests...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('📊 Test Summary:');
  console.log('- If you see 502 errors: Railway routing issue');
  console.log('- If you see 404 errors: Application not serving routes');
  console.log('- If you see 200 responses: Application is working');
  console.log('- If you see timeouts: Network or application startup issue');
}

runTests();
