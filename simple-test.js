// Simple test for template manager
const fs = require('fs');

// Mock chrome environment
global.chrome = {
  storage: {
    local: {
      data: {},
      get: function(key, callback) {
        const result = {};
        if (typeof key === 'string') {
          result[key] = this.data[key];
        }
        callback(result);
      },
      set: function(obj, callback) {
        Object.assign(this.data, obj);
        if (callback) callback();
      }
    }
  },
  runtime: { lastError: null }
};

// Load template manager
const TemplateManager = require('./template-manager.js');

console.log('🧪 Testing Template Manager Core Functions...');

// Test 1: ID Generation
const id1 = TemplateManager.generateTemplateId();
const id2 = TemplateManager.generateTemplateId();
const idTest = id1 !== id2 && id1.includes('template-');
console.log('✅ ID Generation:', idTest);

// Test 2: Template Creation
const sampleData = {
  merchant: { name: 'Test Merchant', category: 'test', categoryGroup: 'TEST' },
  merchantAmount: 25.00,
  merchantCurrency: 'USD',
  policy: 'TEST',
  details: { participants: [], description: 'Test', taxDetails: {}, personal: false },
  reportingData: {}
};

const template = TemplateManager.createTemplate('Test Template', 'Test desc', 'monthly', sampleData);
const createTest = template.id && template.name === 'Test Template';
console.log('✅ Template Creation:', createTest);

// Test 3: Validation
const validation = TemplateManager.validateTemplate(template);
console.log('✅ Template Validation:', validation.isValid);

// Test 4: Conversion
const payload = TemplateManager.templateToExpensePayload(template);
const conversionTest = payload.merchantAmount === 25.00;
console.log('✅ Payload Conversion:', conversionTest);

// Test 5: Invalid Template
const invalidTemplate = { name: '', expenseData: { merchant: { name: '' }, merchantAmount: -1 } };
const invalidValidation = TemplateManager.validateTemplate(invalidTemplate);
const invalidTest = !invalidValidation.isValid;
console.log('✅ Invalid Template Rejected:', invalidTest);

// Summary
const allPassed = idTest && createTest && validation.isValid && conversionTest && invalidTest;
console.log('\n📊 Test Summary:', allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌');

if (!allPassed) {
  console.log('Failed tests need to be fixed before proceeding to task-2');
  process.exit(1);
}