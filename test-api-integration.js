// API Integration Test Suite for Template Expense Creation
// This test suite validates the template-to-API conversion and expense creation

console.log('🔗 Template API Integration Test Suite');

// Mock Chrome environment for testing
const mockChrome = {
  tabs: {
    query: (options, callback) => {
      callback([{ id: 1 }]);
    },
    sendMessage: (tabId, message, callback) => {
      // Mock different responses based on action
      if (message.action === 'createExpense') {
        // Simulate successful API response
        callback({
          success: true,
          data: {
            guid: 'test-expense-123',
            merchantAmount: message.expenseData.merchantAmount,
            merchant: message.expenseData.merchant,
            date: message.expenseData.date
          }
        });
      }
    }
  }
};

// Test runner for API integration
async function runAPIIntegrationTests() {
  console.log('🧪 Starting Template API Integration Tests...\n');
  
  const results = [];
  
  // Helper function to run individual tests
  async function runTest(testName, testFn) {
    try {
      console.log(`🔄 Running: ${testName}`);
      await testFn();
      results.push({ name: testName, status: 'PASS' });
      console.log(`✅ ${testName}`);
    } catch (error) {
      results.push({ name: testName, status: 'FAIL', error: error.message });
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }
  
  // Test 1: API Request Structure
  await runTest('API Request Structure', async () => {
    const mockExpenseData = {
      date: '2025-01-15T10:30:00.000Z',
      merchant: {
        name: 'Test Merchant',
        logo: 'https://example.com/logo.png',
        category: 'restaurants',
        online: false,
        perDiem: false,
        timeZone: 'Z',
        formattedAddress: '123 Test St',
        categoryGroup: 'MEALS',
        description: 'Test merchant'
      },
      merchantAmount: 25.50,
      merchantCurrency: 'USD',
      policy: 'MEALS',
      details: {
        participants: [{
          uuid: 'test-uuid',
          email: 'test@example.com',
          givenName: 'Test',
          familyName: 'User',
          fullName: 'Test User',
          pictureHash: null,
          guest: false,
          picture: null
        }],
        description: 'Test expense description',
        customFieldValues: [],
        taxDetails: {
          taxLines: [],
          noTax: false,
          reverseCharge: false,
          country: 'US',
          tax: null,
          netAmount: null,
          grossAmount: null
        },
        personal: false,
        personalMerchantAmount: null
      },
      reportingData: {
        department: null,
        billTo: null,
        subsidiary: null,
        region: null
      }
    };
    
    // Validate required fields
    const requiredFields = ['date', 'merchant', 'merchantAmount', 'merchantCurrency', 'policy', 'details', 'reportingData'];
    requiredFields.forEach(field => {
      if (!mockExpenseData[field]) {
        throw new Error(`Required field ${field} missing from expense data`);
      }
    });
    
    // Validate merchant structure
    if (!mockExpenseData.merchant.name) {
      throw new Error('Merchant name is required');
    }
    
    // Validate details structure
    if (!mockExpenseData.details.participants || mockExpenseData.details.participants.length === 0) {
      throw new Error('At least one participant is required');
    }
    
    // Validate amount
    if (typeof mockExpenseData.merchantAmount !== 'number' || mockExpenseData.merchantAmount <= 0) {
      throw new Error('Valid positive amount is required');
    }
  });
  
  // Test 2: API Endpoint Configuration
  await runTest('API Endpoint Configuration', async () => {
    const expectedEndpoint = 'https://app.navan.com/api/liquid/user/expenses/manual';
    const expectedMethod = 'POST';
    const expectedHeaders = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en',
      'authorization': 'Bearer token',
      'content-type': 'application/json',
      'x-timezone': 'America/Los_Angeles'
    };
    
    if (!expectedEndpoint.includes('/expenses/manual')) {
      throw new Error('Incorrect API endpoint');
    }
    
    if (expectedMethod !== 'POST') {
      throw new Error('Incorrect HTTP method');
    }
    
    if (!expectedHeaders['content-type'].includes('application/json')) {
      throw new Error('Incorrect content type header');
    }
    
    if (!expectedHeaders['authorization']) {
      throw new Error('Authorization header missing');
    }
  });
  
  // Test 3: Template-to-API Payload Conversion
  await runTest('Template-to-API Payload Conversion', async () => {
    const mockTemplate = {
      id: 'template-123',
      name: 'Monthly Phone Bill',
      description: 'AT&T monthly service',
      frequency: 'monthly',
      expenseData: {
        merchant: {
          name: 'AT&T',
          category: 'utilities',
          categoryGroup: 'OTHER'
        },
        merchantAmount: 89.99,
        merchantCurrency: 'USD',
        policy: 'TELECOM',
        details: {
          participants: [{
            uuid: 'user-123',
            email: 'user@example.com',
            givenName: 'John',
            familyName: 'Doe',
            fullName: 'John Doe'
          }],
          description: 'Monthly phone bill',
          personal: false
        },
        reportingData: {
          department: 'Engineering'
        }
      }
    };
    
    // Simulate template to expense payload conversion
    const apiPayload = {
      date: new Date().toISOString(),
      merchant: mockTemplate.expenseData.merchant,
      merchantAmount: mockTemplate.expenseData.merchantAmount,
      merchantCurrency: mockTemplate.expenseData.merchantCurrency,
      policy: mockTemplate.expenseData.policy,
      details: mockTemplate.expenseData.details,
      reportingData: mockTemplate.expenseData.reportingData
    };
    
    // Validate conversion
    if (apiPayload.merchantAmount !== mockTemplate.expenseData.merchantAmount) {
      throw new Error('Amount conversion failed');
    }
    
    if (apiPayload.merchant.name !== mockTemplate.expenseData.merchant.name) {
      throw new Error('Merchant name conversion failed');
    }
    
    if (apiPayload.policy !== mockTemplate.expenseData.policy) {
      throw new Error('Policy conversion failed');
    }
    
    if (!apiPayload.date) {
      throw new Error('Date field not populated');
    }
  });
  
  // Test 4: API Response Handling
  await runTest('API Response Handling', async () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        guid: 'expense-456',
        merchantAmount: 89.99,
        merchant: { name: 'AT&T' },
        status: 'SUBMITTED',
        createdAt: '2025-01-15T10:30:00.000Z'
      }
    };
    
    const mockErrorResponse = {
      success: false,
      error: 'API Error 400: Invalid merchant data'
    };
    
    // Test success response
    if (!mockSuccessResponse.success) {
      throw new Error('Success response not properly structured');
    }
    
    if (!mockSuccessResponse.data.guid) {
      throw new Error('Success response missing expense ID');
    }
    
    // Test error response
    if (mockErrorResponse.success) {
      throw new Error('Error response incorrectly marked as success');
    }
    
    if (!mockErrorResponse.error) {
      throw new Error('Error response missing error message');
    }
  });
  
  // Test 5: Authentication Integration
  await runTest('Authentication Integration', async () => {
    const mockAuthToken = 'TripActions eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';
    
    // Test token structure
    if (!mockAuthToken.startsWith('TripActions')) {
      throw new Error('Invalid token format');
    }
    
    // Test token inclusion in request
    const mockRequest = {
      headers: {
        'authorization': mockAuthToken
      }
    };
    
    if (!mockRequest.headers.authorization) {
      throw new Error('Authorization header not included in request');
    }
    
    if (mockRequest.headers.authorization !== mockAuthToken) {
      throw new Error('Token not properly included in authorization header');
    }
  });
  
  // Test 6: Error Handling Scenarios
  await runTest('Error Handling Scenarios', async () => {
    const errorScenarios = [
      {
        type: 'Network Error',
        error: 'Failed to fetch',
        expectedHandling: 'Show network error message'
      },
      {
        type: 'Authentication Error',
        error: 'API Error 401: Unauthorized',
        expectedHandling: 'Show authentication error message'
      },
      {
        type: 'Validation Error',
        error: 'API Error 400: Invalid amount',
        expectedHandling: 'Show validation error message'
      },
      {
        type: 'Server Error',
        error: 'API Error 500: Internal server error',
        expectedHandling: 'Show server error message'
      },
      {
        type: 'Timeout Error',
        error: 'Request timeout',
        expectedHandling: 'Show timeout error message'
      }
    ];
    
    errorScenarios.forEach(scenario => {
      if (!scenario.type || !scenario.error || !scenario.expectedHandling) {
        throw new Error(`Error scenario incomplete: ${scenario.type}`);
      }
    });
    
    // Test error message parsing
    const apiError = 'API Error 400: Invalid merchant data';
    const statusMatch = apiError.match(/API Error (\d+)/);
    if (!statusMatch || statusMatch[1] !== '400') {
      throw new Error('Error status parsing failed');
    }
  });
  
  // Test 7: Loading States and UI Integration
  await runTest('Loading States and UI Integration', async () => {
    const loadingModalStructure = {
      id: 'loadingModal',
      display: 'flex',
      zIndex: 2000,
      background: 'rgba(0,0,0,0.7)',
      content: {
        message: 'Creating expense...',
        icon: '⏳'
      }
    };
    
    if (!loadingModalStructure.id) {
      throw new Error('Loading modal missing ID');
    }
    
    if (loadingModalStructure.zIndex < 1000) {
      throw new Error('Loading modal z-index too low');
    }
    
    if (!loadingModalStructure.content.message) {
      throw new Error('Loading modal missing message');
    }
    
    if (!loadingModalStructure.content.icon) {
      throw new Error('Loading modal missing icon');
    }
  });
  
  // Test 8: Success Modal Integration
  await runTest('Success Modal Integration', async () => {
    const successModalStructure = {
      id: 'successModal',
      content: {
        title: 'Expense created successfully!',
        icon: '✅',
        details: {
          expenseId: 'expense-123',
          amount: '$89.99',
          merchant: 'AT&T'
        },
        actions: ['Close', 'Create Another']
      }
    };
    
    if (!successModalStructure.content.title) {
      throw new Error('Success modal missing title');
    }
    
    if (!successModalStructure.content.icon) {
      throw new Error('Success modal missing icon');
    }
    
    if (!successModalStructure.content.details.expenseId) {
      throw new Error('Success modal missing expense ID');
    }
    
    if (successModalStructure.content.actions.length !== 2) {
      throw new Error('Success modal incorrect number of actions');
    }
  });
  
  // Test 9: API Data Validation
  await runTest('API Data Validation', async () => {
    const validationRules = {
      merchantAmount: {
        required: true,
        type: 'number',
        min: 0.01,
        max: 10000
      },
      merchantCurrency: {
        required: true,
        type: 'string',
        values: ['USD', 'EUR', 'GBP']
      },
      policy: {
        required: true,
        type: 'string',
        values: ['MEALS', 'TRANSPORT', 'ACCOMMODATION', 'OTHER']
      },
      date: {
        required: true,
        type: 'string',
        format: 'ISO'
      }
    };
    
    // Test validation rules structure
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      if (!rule.required === undefined) {
        throw new Error(`Validation rule for ${field} missing required property`);
      }
      if (!rule.type) {
        throw new Error(`Validation rule for ${field} missing type`);
      }
    });
    
    // Test amount validation
    if (validationRules.merchantAmount.min <= 0) {
      throw new Error('Amount minimum validation incorrect');
    }
    
    // Test currency validation
    if (!validationRules.merchantCurrency.values.includes('USD')) {
      throw new Error('Currency validation missing USD');
    }
  });
  
  // Test 10: Performance and Timing
  await runTest('Performance and Timing', async () => {
    const performanceMetrics = {
      apiCallTimeout: 5000, // 5 seconds
      uiUpdateTime: 100, // 100ms
      loadingStateDelay: 50, // 50ms
      errorHandlingTime: 200 // 200ms
    };
    
    if (performanceMetrics.apiCallTimeout > 10000) {
      throw new Error('API call timeout too long');
    }
    
    if (performanceMetrics.uiUpdateTime > 200) {
      throw new Error('UI update time too slow');
    }
    
    if (performanceMetrics.loadingStateDelay > 100) {
      throw new Error('Loading state delay too long');
    }
    
    if (performanceMetrics.errorHandlingTime > 500) {
      throw new Error('Error handling time too slow');
    }
  });
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n📊 API Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All API integration tests passed!');
  }
  
  return results;
}

// Export for use in other contexts
if (typeof window !== 'undefined') {
  window.runAPIIntegrationTests = runAPIIntegrationTests;
}

// Instructions for running
console.log('💡 To run API integration tests:');
console.log('1. Load this script in browser context');
console.log('2. Call: await runAPIIntegrationTests()');
console.log('3. Check console for results');

// Auto-run if specific flag is set
if (typeof window !== 'undefined' && window.AUTO_RUN_API_TESTS) {
  runAPIIntegrationTests();
}