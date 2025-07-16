// Test Suite for Template Manager
// Run this file in Chrome DevTools console or as a content script

// Mock chrome.storage.local for testing
const mockStorage = {
  data: {},
  get: function(key, callback) {
    const result = {};
    if (typeof key === 'string') {
      result[key] = this.data[key];
    } else if (Array.isArray(key)) {
      key.forEach(k => result[k] = this.data[k]);
    }
    callback(result);
  },
  set: function(obj, callback) {
    Object.assign(this.data, obj);
    if (callback) callback();
  },
  clear: function(callback) {
    this.data = {};
    if (callback) callback();
  }
};

// Test framework
class TestFramework {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Starting Template Manager Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.push({ name: test.name, status: 'PASS' });
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    this.summary();
  }

  summary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
  }
}

// Test sample data
const sampleExpenseData = {
  merchant: {
    name: "AT&T",
    logo: "https://example.com/att-logo.png",
    category: "telecommunications",
    online: false,
    perDiem: false,
    timeZone: "Z",
    formattedAddress: "123 Main St, Anytown, USA",
    categoryGroup: "UTILITIES",
    description: "Phone service provider"
  },
  merchantAmount: 89.99,
  merchantCurrency: "USD",
  policy: "PHONE",
  details: {
    participants: [
      {
        uuid: "test-user-uuid",
        email: "test@example.com",
        givenName: "Test",
        familyName: "User",
        fullName: "Test User",
        pictureHash: null,
        guest: false,
        picture: null
      }
    ],
    description: "Monthly phone bill",
    customFieldValues: [],
    taxDetails: {
      taxLines: [],
      noTax: false,
      reverseCharge: false,
      country: "US",
      tax: null,
      netAmount: null,
      grossAmount: null
    },
    personal: false,
    personalMerchantAmount: null
  },
  reportingData: {
    department: "IT",
    billTo: "HQ",
    subsidiary: "Main",
    region: "US"
  }
};

// Initialize test framework
const testFramework = new TestFramework();

// Test 1: Template ID Generation
testFramework.test('Template ID Generation', () => {
  const id1 = TemplateManager.generateTemplateId();
  const id2 = TemplateManager.generateTemplateId();
  
  testFramework.assert(id1.startsWith('template-'), 'ID should start with template-');
  testFramework.assert(id1 !== id2, 'IDs should be unique');
  testFramework.assert(id1.length > 20, 'ID should be sufficiently long');
});

// Test 2: Template Creation
testFramework.test('Template Creation', () => {
  const template = TemplateManager.createTemplate(
    "Monthly Phone Bill",
    "AT&T monthly service",
    "monthly",
    sampleExpenseData
  );
  
  testFramework.assert(template.id, 'Template should have ID');
  testFramework.assertEqual(template.name, "Monthly Phone Bill", 'Name should match');
  testFramework.assertEqual(template.description, "AT&T monthly service", 'Description should match');
  testFramework.assertEqual(template.frequency, "monthly", 'Frequency should match');
  testFramework.assertEqual(template.version, 1, 'Version should be 1');
  testFramework.assert(template.createdAt, 'Should have createdAt timestamp');
  testFramework.assert(template.updatedAt, 'Should have updatedAt timestamp');
  testFramework.assert(template.expenseData, 'Should have expenseData');
});

// Test 3: Data Sanitization
testFramework.test('Data Sanitization', () => {
  const sanitized = TemplateManager.sanitizeExpenseData(sampleExpenseData);
  
  testFramework.assertEqual(sanitized.merchant.name, "AT&T", 'Merchant name should be preserved');
  testFramework.assertEqual(sanitized.merchantAmount, 89.99, 'Amount should be preserved');
  testFramework.assertEqual(sanitized.merchantCurrency, "USD", 'Currency should be preserved');
  testFramework.assert(sanitized.details.participants, 'Participants should be preserved');
});

// Test 4: Template Validation - Valid Template
testFramework.test('Template Validation - Valid Template', () => {
  const template = TemplateManager.createTemplate(
    "Valid Template",
    "Test description",
    "monthly",
    sampleExpenseData
  );
  
  const validation = TemplateManager.validateTemplate(template);
  testFramework.assert(validation.isValid, 'Valid template should pass validation');
  testFramework.assertEqual(validation.errors.length, 0, 'Should have no errors');
});

// Test 5: Template Validation - Missing Required Fields
testFramework.test('Template Validation - Missing Required Fields', () => {
  const invalidTemplate = {
    id: "test-id",
    name: "", // Missing required field
    description: "Test",
    frequency: "monthly",
    version: 1,
    expenseData: {
      merchant: { name: "" }, // Missing required field
      merchantAmount: 0, // Invalid amount
      merchantCurrency: "",
      policy: ""
    }
  };
  
  const validation = TemplateManager.validateTemplate(invalidTemplate);
  testFramework.assert(!validation.isValid, 'Invalid template should fail validation');
  testFramework.assert(validation.errors.length > 0, 'Should have validation errors');
});

// Test 6: Template Validation - Invalid Values
testFramework.test('Template Validation - Invalid Values', () => {
  const template = TemplateManager.createTemplate(
    "Test Template",
    "Test description",
    "invalid-frequency", // Invalid frequency
    sampleExpenseData
  );
  
  const validation = TemplateManager.validateTemplate(template);
  testFramework.assert(!validation.isValid, 'Template with invalid frequency should fail');
  testFramework.assert(validation.errors.some(e => e.includes('frequency')), 'Should have frequency error');
});

// Test 7: Template Validation - Size Limits
testFramework.test('Template Validation - Size Limits', () => {
  const largeTemplate = TemplateManager.createTemplate(
    "A".repeat(100), // Exceeds name length limit
    "B".repeat(300), // Exceeds description length limit
    "monthly",
    sampleExpenseData
  );
  
  const validation = TemplateManager.validateTemplate(largeTemplate);
  testFramework.assert(!validation.isValid, 'Template exceeding size limits should fail');
  testFramework.assert(validation.errors.some(e => e.includes('name')), 'Should have name length error');
  testFramework.assert(validation.errors.some(e => e.includes('description')), 'Should have description length error');
});

// Test 8: Nested Value Getter
testFramework.test('Nested Value Getter', () => {
  const obj = {
    level1: {
      level2: {
        level3: "deep-value"
      }
    }
  };
  
  const value = TemplateManager.getNestedValue(obj, "level1.level2.level3");
  testFramework.assertEqual(value, "deep-value", 'Should retrieve nested value');
  
  const missing = TemplateManager.getNestedValue(obj, "level1.missing.value");
  testFramework.assertEqual(missing, undefined, 'Should return undefined for missing path');
});

// Test 9: Template to Expense Payload Conversion
testFramework.test('Template to Expense Payload Conversion', () => {
  const template = TemplateManager.createTemplate(
    "Test Template",
    "Test description",
    "monthly",
    sampleExpenseData
  );
  
  const payload = TemplateManager.templateToExpensePayload(template, {
    merchantAmount: 99.99,
    description: "Override description"
  });
  
  testFramework.assert(payload.date, 'Should have date field');
  testFramework.assertEqual(payload.merchantAmount, 99.99, 'Should use override amount');
  testFramework.assertEqual(payload.details.description, "Override description", 'Should use override description');
  testFramework.assertEqual(payload.merchant.name, "AT&T", 'Should preserve merchant name');
});

// Test 10: Mock Storage Integration
testFramework.test('Storage Integration (Mock)', async () => {
  // Override chrome.storage.local temporarily
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: { local: mockStorage },
    runtime: { lastError: null }
  };
  
  try {
    // Clear storage
    mockStorage.clear();
    
    // Test getAllTemplates with empty storage
    const emptyTemplates = await TemplateManager.getAllTemplates();
    testFramework.assertEqual(emptyTemplates.length, 0, 'Should return empty array for empty storage');
    
    // Mock some templates in storage
    const template1 = TemplateManager.createTemplate("Template 1", "Description 1", "monthly", sampleExpenseData);
    const template2 = TemplateManager.createTemplate("Template 2", "Description 2", "weekly", sampleExpenseData);
    
    mockStorage.set({
      expenseTemplates: {
        [template1.id]: template1,
        [template2.id]: template2
      }
    });
    
    // Test getAllTemplates with data
    const templates = await TemplateManager.getAllTemplates();
    testFramework.assertEqual(templates.length, 2, 'Should return 2 templates');
    testFramework.assert(templates.some(t => t.name === "Template 1"), 'Should include Template 1');
    testFramework.assert(templates.some(t => t.name === "Template 2"), 'Should include Template 2');
    
  } finally {
    // Restore original chrome object
    globalThis.chrome = originalChrome;
  }
});

// Test 11: Storage Usage Calculation
testFramework.test('Storage Usage Calculation (Mock)', async () => {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: { local: mockStorage },
    runtime: { lastError: null }
  };
  
  try {
    mockStorage.clear();
    
    // Add test templates
    const template1 = TemplateManager.createTemplate("Template 1", "Description 1", "monthly", sampleExpenseData);
    const template2 = TemplateManager.createTemplate("Template 2", "Description 2", "weekly", sampleExpenseData);
    
    mockStorage.set({
      expenseTemplates: {
        [template1.id]: template1,
        [template2.id]: template2
      }
    });
    
    const usage = await TemplateManager.getStorageUsage();
    
    testFramework.assertEqual(usage.templateCount, 2, 'Should count 2 templates');
    testFramework.assert(usage.totalSize > 0, 'Should have positive total size');
    testFramework.assert(usage.averageSize > 0, 'Should have positive average size');
    testFramework.assert(usage.percentageUsed >= 0, 'Should have valid percentage');
    
  } finally {
    globalThis.chrome = originalChrome;
  }
});

// Test 12: Template Name Uniqueness (Mock)
testFramework.test('Template Name Uniqueness (Mock)', async () => {
  const originalChrome = globalThis.chrome;
  globalThis.chrome = {
    storage: { local: mockStorage },
    runtime: { lastError: null }
  };
  
  try {
    mockStorage.clear();
    
    const template1 = TemplateManager.createTemplate("Unique Name", "Description", "monthly", sampleExpenseData);
    
    mockStorage.set({
      expenseTemplates: {
        [template1.id]: template1
      }
    });
    
    // Test unique name
    const isUnique1 = await TemplateManager.isTemplateNameUnique("Different Name");
    testFramework.assert(isUnique1, 'Different name should be unique');
    
    // Test duplicate name
    const isUnique2 = await TemplateManager.isTemplateNameUnique("Unique Name");
    testFramework.assert(!isUnique2, 'Same name should not be unique');
    
    // Test case insensitive
    const isUnique3 = await TemplateManager.isTemplateNameUnique("unique name");
    testFramework.assert(!isUnique3, 'Case insensitive duplicate should not be unique');
    
    // Test excluding current template
    const isUnique4 = await TemplateManager.isTemplateNameUnique("Unique Name", template1.id);
    testFramework.assert(isUnique4, 'Should be unique when excluding current template');
    
  } finally {
    globalThis.chrome = originalChrome;
  }
});

// Export test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testFramework, mockStorage };
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
  console.log('⚠️  Running tests in browser environment. Some tests may not work properly.');
  console.log('💡 For full testing, run this script in Chrome DevTools console.');
}

// Global test runner function
window.runTemplateManagerTests = async function() {
  await testFramework.run();
  return testFramework.results;
};