#!/usr/bin/env node

/**
 * Standalone script to test Navan API parameters
 * Run this script directly to test which query parameters work with the /search/transactions endpoint
 * 
 * Usage: node test-api-params.js
 */

const https = require('https');

// IMPORTANT: Replace this with your actual auth token from Navan
// You can get this from the Chrome DevTools Network tab while logged into Navan
const AUTH_TOKEN = 'TripActions YOUR_TOKEN_HERE';

// Base configuration
const API_HOST = 'app.navan.com';
const API_PATH = '/api/liquid/user/search/transactions';

// Test parameter sets
const testParameters = {
  pagination: [
    { param: 'limit', value: 5 },
    { param: 'size', value: 5 },
    { param: 'pageSize', value: 5 },
    { param: 'max', value: 5 },
    { param: 'count', value: 5 },
    { param: 'offset', value: 0 },
    { param: 'skip', value: 0 },
    { param: 'page', value: 1 },
    { param: 'pageNumber', value: 1 },
  ],
  sorting: [
    { param: 'sort', value: 'date' },
    { param: 'sort', value: '-date' },
    { param: 'sort', value: 'amount' },
    { param: 'sortBy', value: 'date' },
    { param: 'orderBy', value: 'date' },
    { param: 'order', value: 'asc' },
    { param: 'order', value: 'desc' },
    { param: 'direction', value: 'asc' },
  ],
  dates: [
    { param: 'from', value: '2024-01-01' },
    { param: 'to', value: '2024-12-31' },
    { param: 'startDate', value: '2024-01-01' },
    { param: 'endDate', value: '2024-12-31' },
    { param: 'dateFrom', value: '2024-01-01' },
    { param: 'dateTo', value: '2024-12-31' },
    { param: 'authorizationInstant.from', value: '2024-01-01T00:00:00Z' },
    { param: 'authorizationInstant.to', value: '2024-12-31T23:59:59Z' },
  ],
  filters: [
    { param: 'status', value: 'pending' },
    { param: 'state', value: 'pending' },
    { param: 'category', value: 'travel' },
    { param: 'type', value: 'expense' },
    { param: 'minAmount', value: 10 },
    { param: 'maxAmount', value: 1000 },
    { param: 'currency', value: 'USD' },
    { param: 'hasReceipt', value: true },
    { param: 'reimbursable', value: true },
    { param: 'merchant', value: 'Delta' },
  ]
};

// Function to make API request
function testParameter(param, value) {
  return new Promise((resolve) => {
    const queryParams = new URLSearchParams({
      q: 'Delta', // Base query
      [param]: value
    }).toString();
    
    const options = {
      hostname: API_HOST,
      path: `${API_PATH}?${queryParams}`,
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en',
        'authorization': AUTH_TOKEN,
        'x-timezone': 'America/Los_Angeles',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          parameter: param,
          value: value,
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          responseSize: data.length
        };
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            result.resultCount = Array.isArray(jsonData) ? jsonData.length : 
                                jsonData.data ? jsonData.data.length : 0;
          } catch (e) {
            result.parseError = true;
          }
        } else {
          result.error = data.substring(0, 200);
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      resolve({
        parameter: param,
        value: value,
        success: false,
        error: error.message
      });
    });
    
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log('=== Navan API Parameter Test ===\n');
  
  if (AUTH_TOKEN === 'TripActions YOUR_TOKEN_HERE') {
    console.error('ERROR: Please update the AUTH_TOKEN variable with your actual token!');
    console.log('\nTo get your token:');
    console.log('1. Open Chrome DevTools (F12)');
    console.log('2. Go to Network tab');
    console.log('3. Log into Navan');
    console.log('4. Look for any API request to app.navan.com');
    console.log('5. Check the Request Headers for "authorization"');
    console.log('6. Copy the entire value starting with "TripActions "');
    process.exit(1);
  }
  
  const results = {
    working: [],
    failed: [],
    total: 0
  };
  
  for (const [category, tests] of Object.entries(testParameters)) {
    console.log(`\nTesting ${category} parameters...`);
    
    for (const test of tests) {
      process.stdout.write(`  Testing ${test.param}=${test.value}... `);
      const result = await testParameter(test.param, test.value);
      results.total++;
      
      if (result.success) {
        console.log(`✓ (${result.resultCount || 0} results)`);
        results.working.push(result);
      } else {
        console.log(`✗ (${result.statusCode || 'error'})`);
        results.failed.push(result);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total parameters tested: ${results.total}`);
  console.log(`Working parameters: ${results.working.length}`);
  console.log(`Failed parameters: ${results.failed.length}`);
  
  console.log('\n=== WORKING PARAMETERS ===');
  results.working.forEach(r => {
    console.log(`✓ ${r.parameter} = ${r.value} (${r.resultCount} results)`);
  });
  
  console.log('\n=== FAILED PARAMETERS ===');
  results.failed.forEach(r => {
    console.log(`✗ ${r.parameter} = ${r.value} (${r.statusCode || 'error'})`);
  });
  
  // Generate TypeScript interface update
  console.log('\n=== SUGGESTED TypeScript INTERFACE ===');
  console.log('Add these to ExpenseFilters in src/features/expenses/types.ts:\n');
  
  const workingParams = [...new Set(results.working.map(r => r.parameter))];
  workingParams.forEach(param => {
    const result = results.working.find(r => r.parameter === param);
    const type = typeof result.value === 'boolean' ? 'boolean' : 
                 typeof result.value === 'number' ? 'number' : 'string';
    console.log(`  ${param}?: ${type};`);
  });
}

// Run the tests
runTests().catch(console.error);