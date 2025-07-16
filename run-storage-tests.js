// Simple test runner for storage system
const TemplateManager = require('./template-manager.js');

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
      },
      remove: function(key, callback) {
        delete this.data[key];
        if (callback) callback();
      }
    }
  },
  runtime: { lastError: null }
};

async function runStorageTests() {
  console.log('🧪 Testing Storage System Implementation...\n');
  
  const sampleData = {
    merchant: { name: 'Test Merchant', category: 'test', categoryGroup: 'TEST' },
    merchantAmount: 25.00,
    merchantCurrency: 'USD',
    policy: 'TEST',
    details: { participants: [], description: 'Test', taxDetails: {}, personal: false },
    reportingData: {}
  };
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Save Template
  try {
    console.log('1. Testing saveTemplate()...');
    const template = TemplateManager.createTemplate('Test Template', 'Test desc', 'monthly', sampleData);
    const result = await TemplateManager.saveTemplate(template);
    console.log('✅ saveTemplate() - SUCCESS:', result.success);
    testsPassed++;
  } catch (error) {
    console.log('❌ saveTemplate() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 2: Get All Templates
  try {
    console.log('2. Testing getAllTemplates()...');
    const templates = await TemplateManager.getAllTemplates();
    console.log('✅ getAllTemplates() - SUCCESS, count:', templates.length);
    testsPassed++;
  } catch (error) {
    console.log('❌ getAllTemplates() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 3: Get Template by ID
  try {
    console.log('3. Testing getTemplate()...');
    const templates = await TemplateManager.getAllTemplates();
    if (templates.length > 0) {
      const template = await TemplateManager.getTemplate(templates[0].id);
      console.log('✅ getTemplate() - SUCCESS:', template.name);
      testsPassed++;
    } else {
      throw new Error('No templates to retrieve');
    }
  } catch (error) {
    console.log('❌ getTemplate() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 4: Update Template
  try {
    console.log('4. Testing updateTemplate()...');
    const templates = await TemplateManager.getAllTemplates();
    if (templates.length > 0) {
      const updatedData = { ...templates[0], name: 'Updated Template', description: 'Updated desc' };
      const result = await TemplateManager.updateTemplate(templates[0].id, updatedData);
      console.log('✅ updateTemplate() - SUCCESS:', result.success);
      testsPassed++;
    } else {
      throw new Error('No templates to update');
    }
  } catch (error) {
    console.log('❌ updateTemplate() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 5: Storage Usage
  try {
    console.log('5. Testing getStorageUsage()...');
    const usage = await TemplateManager.getStorageUsage();
    console.log('✅ getStorageUsage() - SUCCESS, count:', usage.templateCount);
    testsPassed++;
  } catch (error) {
    console.log('❌ getStorageUsage() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 6: Export Templates
  try {
    console.log('6. Testing exportTemplates()...');
    const exportData = await TemplateManager.exportTemplates();
    console.log('✅ exportTemplates() - SUCCESS, length:', exportData.length);
    testsPassed++;
  } catch (error) {
    console.log('❌ exportTemplates() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 7: Delete Template
  try {
    console.log('7. Testing deleteTemplate()...');
    const templates = await TemplateManager.getAllTemplates();
    if (templates.length > 0) {
      const result = await TemplateManager.deleteTemplate(templates[0].id);
      console.log('✅ deleteTemplate() - SUCCESS:', result.success);
      testsPassed++;
    } else {
      throw new Error('No templates to delete');
    }
  } catch (error) {
    console.log('❌ deleteTemplate() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 8: Validation Error Handling
  try {
    console.log('8. Testing validation error handling...');
    const invalidTemplate = {
      id: 'invalid',
      name: '', // Invalid name
      description: 'Test',
      frequency: 'monthly',
      version: 1,
      expenseData: {
        merchant: { name: '' }, // Invalid merchant
        merchantAmount: -10, // Invalid amount
        merchantCurrency: '',
        policy: ''
      }
    };
    
    try {
      await TemplateManager.saveTemplate(invalidTemplate);
      throw new Error('Should have thrown validation error');
    } catch (validationError) {
      if (validationError.message.includes('validation failed')) {
        console.log('✅ Validation error handling - SUCCESS');
        testsPassed++;
      } else {
        throw validationError;
      }
    }
  } catch (error) {
    console.log('❌ Validation error handling - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 9: Name Uniqueness
  try {
    console.log('9. Testing name uniqueness...');
    const template1 = TemplateManager.createTemplate('Unique Name', 'First', 'monthly', sampleData);
    const template2 = TemplateManager.createTemplate('Unique Name', 'Second', 'weekly', sampleData);
    
    await TemplateManager.saveTemplate(template1);
    
    try {
      await TemplateManager.saveTemplate(template2);
      throw new Error('Should have thrown uniqueness error');
    } catch (uniquenessError) {
      if (uniquenessError.message.includes('already exists')) {
        console.log('✅ Name uniqueness - SUCCESS');
        testsPassed++;
      } else {
        throw uniquenessError;
      }
    }
  } catch (error) {
    console.log('❌ Name uniqueness - FAILED:', error.message);
    testsFailed++;
  }
  
  // Test 10: Template to Expense Payload
  try {
    console.log('10. Testing templateToExpensePayload()...');
    const template = TemplateManager.createTemplate('Payload Test', 'Test payload', 'monthly', sampleData);
    const payload = TemplateManager.templateToExpensePayload(template, { merchantAmount: 50.00 });
    
    if (payload.merchantAmount === 50.00 && payload.merchant.name === 'Test Merchant') {
      console.log('✅ templateToExpensePayload() - SUCCESS');
      testsPassed++;
    } else {
      throw new Error('Payload conversion failed');
    }
  } catch (error) {
    console.log('❌ templateToExpensePayload() - FAILED:', error.message);
    testsFailed++;
  }
  
  // Summary
  console.log(`\n📊 Storage System Test Results:`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All storage system tests passed! Ready for production use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.');
  }
}

runStorageTests();