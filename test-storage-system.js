// Comprehensive test suite for template storage system
// Tests all CRUD operations, error handling, and edge cases

// Test framework
class StorageTestFramework {
  constructor() {
    this.tests = [];
    this.results = [];
    this.mockStorage = {
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
      remove: function(key, callback) {
        if (typeof key === 'string') {
          delete this.data[key];
        } else if (Array.isArray(key)) {
          key.forEach(k => delete this.data[k]);
        }
        if (callback) callback();
      },
      clear: function(callback) {
        this.data = {};
        if (callback) callback();
      }
    };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Starting Storage System Tests...\n');
    
    // Setup mock Chrome environment
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      storage: { local: this.mockStorage },
      runtime: { lastError: null }
    };
    
    try {
      for (const test of this.tests) {
        try {
          // Clear storage before each test
          this.mockStorage.clear();
          
          await test.fn();
          this.results.push({ name: test.name, status: 'PASS' });
          console.log(`✅ ${test.name}`);
        } catch (error) {
          this.results.push({ name: test.name, status: 'FAIL', error: error.message });
          console.log(`❌ ${test.name}: ${error.message}`);
        }
      }
    } finally {
      // Restore original Chrome object
      globalThis.chrome = originalChrome;
    }
    
    this.summary();
  }

  summary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📊 Storage Test Results: ${passed} passed, ${failed} failed`);
    
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

  assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
  }

  async assertThrows(fn, message) {
    try {
      await fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      if (error.message === message || error.message.includes('Expected function to throw')) {
        throw error;
      }
      // Expected error was thrown
    }
  }
}

// Sample test data
const sampleExpenseData = {
  merchant: {
    name: "Test Merchant",
    category: "test",
    categoryGroup: "TEST",
    online: false,
    perDiem: false,
    timeZone: "Z",
    formattedAddress: "",
    description: ""
  },
  merchantAmount: 25.00,
  merchantCurrency: "USD",
  policy: "TEST",
  details: {
    participants: [],
    description: "Test expense",
    customFieldValues: [],
    taxDetails: {},
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

// Initialize test framework
const storageTest = new StorageTestFramework();

// Test 1: Save Template - Success Case
storageTest.test('Save Template - Success Case', async () => {
  const template = TemplateManager.createTemplate(
    "Test Template",
    "Test description",
    "monthly",
    sampleExpenseData
  );
  
  const result = await TemplateManager.saveTemplate(template);
  
  storageTest.assert(result.success, 'Save operation should succeed');
  storageTest.assertEqual(result.templateId, template.id, 'Should return correct template ID');
  
  // Verify template was stored
  const savedTemplate = await TemplateManager.getTemplate(template.id);
  storageTest.assertEqual(savedTemplate.name, "Test Template", 'Template name should match');
  storageTest.assertEqual(savedTemplate.description, "Test description", 'Template description should match');
});

// Test 2: Save Template - Validation Failure
storageTest.test('Save Template - Validation Failure', async () => {
  const invalidTemplate = {
    id: "test-id",
    name: "", // Missing required field
    description: "Test",
    frequency: "monthly",
    version: 1,
    expenseData: {
      merchant: { name: "" }, // Missing required field
      merchantAmount: -5, // Invalid amount
      merchantCurrency: "",
      policy: ""
    }
  };
  
  await storageTest.assertThrows(
    () => TemplateManager.saveTemplate(invalidTemplate),
    'Should throw validation error'
  );
});

// Test 3: Save Template - Name Uniqueness
storageTest.test('Save Template - Name Uniqueness', async () => {
  const template1 = TemplateManager.createTemplate(
    "Unique Template",
    "First template",
    "monthly",
    sampleExpenseData
  );
  
  const template2 = TemplateManager.createTemplate(
    "Unique Template",
    "Second template",
    "weekly",
    sampleExpenseData
  );
  
  // Save first template
  await TemplateManager.saveTemplate(template1);
  
  // Try to save second template with same name
  await storageTest.assertThrows(
    () => TemplateManager.saveTemplate(template2),
    'Should throw name uniqueness error'
  );
});

// Test 4: Get Template - Success Case
storageTest.test('Get Template - Success Case', async () => {
  const template = TemplateManager.createTemplate(
    "Get Test Template",
    "Test getting template",
    "monthly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template);
  const retrievedTemplate = await TemplateManager.getTemplate(template.id);
  
  storageTest.assertEqual(retrievedTemplate.id, template.id, 'Template ID should match');
  storageTest.assertEqual(retrievedTemplate.name, "Get Test Template", 'Template name should match');
  storageTest.assertEqual(retrievedTemplate.description, "Test getting template", 'Template description should match');
});

// Test 5: Get Template - Not Found
storageTest.test('Get Template - Not Found', async () => {
  await storageTest.assertThrows(
    () => TemplateManager.getTemplate("non-existent-id"),
    'Should throw not found error'
  );
});

// Test 6: Update Template - Success Case
storageTest.test('Update Template - Success Case', async () => {
  const template = TemplateManager.createTemplate(
    "Update Test",
    "Original description",
    "monthly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template);
  
  const updatedData = {
    ...template,
    name: "Updated Template",
    description: "Updated description",
    frequency: "weekly"
  };
  
  const result = await TemplateManager.updateTemplate(template.id, updatedData);
  
  storageTest.assert(result.success, 'Update operation should succeed');
  storageTest.assertEqual(result.templateId, template.id, 'Should return correct template ID');
  
  // Verify template was updated
  const updatedTemplate = await TemplateManager.getTemplate(template.id);
  storageTest.assertEqual(updatedTemplate.name, "Updated Template", 'Template name should be updated');
  storageTest.assertEqual(updatedTemplate.description, "Updated description", 'Template description should be updated');
  storageTest.assertEqual(updatedTemplate.frequency, "weekly", 'Template frequency should be updated');
  storageTest.assertEqual(updatedTemplate.createdAt, template.createdAt, 'Creation timestamp should be preserved');
  storageTest.assertNotEqual(updatedTemplate.updatedAt, template.updatedAt, 'Update timestamp should be changed');
});

// Test 7: Update Template - Not Found
storageTest.test('Update Template - Not Found', async () => {
  const updateData = {
    name: "Non-existent Template",
    description: "This should fail",
    frequency: "monthly"
  };
  
  await storageTest.assertThrows(
    () => TemplateManager.updateTemplate("non-existent-id", updateData),
    'Should throw not found error'
  );
});

// Test 8: Update Template - Name Uniqueness
storageTest.test('Update Template - Name Uniqueness', async () => {
  const template1 = TemplateManager.createTemplate(
    "First Template",
    "First template",
    "monthly",
    sampleExpenseData
  );
  
  const template2 = TemplateManager.createTemplate(
    "Second Template",
    "Second template",
    "weekly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template1);
  await TemplateManager.saveTemplate(template2);
  
  // Try to update template2 to have same name as template1
  const updateData = {
    ...template2,
    name: "First Template"
  };
  
  await storageTest.assertThrows(
    () => TemplateManager.updateTemplate(template2.id, updateData),
    'Should throw name uniqueness error'
  );
});

// Test 9: Delete Template - Success Case
storageTest.test('Delete Template - Success Case', async () => {
  const template = TemplateManager.createTemplate(
    "Delete Test",
    "Template to delete",
    "monthly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template);
  
  // Verify template exists
  const existingTemplate = await TemplateManager.getTemplate(template.id);
  storageTest.assert(existingTemplate, 'Template should exist before deletion');
  
  // Delete template
  const result = await TemplateManager.deleteTemplate(template.id);
  
  storageTest.assert(result.success, 'Delete operation should succeed');
  storageTest.assertEqual(result.templateId, template.id, 'Should return correct template ID');
  
  // Verify template was deleted
  await storageTest.assertThrows(
    () => TemplateManager.getTemplate(template.id),
    'Template should not exist after deletion'
  );
});

// Test 10: Delete Template - Not Found
storageTest.test('Delete Template - Not Found', async () => {
  await storageTest.assertThrows(
    () => TemplateManager.deleteTemplate("non-existent-id"),
    'Should throw not found error'
  );
});

// Test 11: Get All Templates - Empty Storage
storageTest.test('Get All Templates - Empty Storage', async () => {
  const templates = await TemplateManager.getAllTemplates();
  
  storageTest.assert(Array.isArray(templates), 'Should return array');
  storageTest.assertEqual(templates.length, 0, 'Should return empty array');
});

// Test 12: Get All Templates - With Data
storageTest.test('Get All Templates - With Data', async () => {
  const template1 = TemplateManager.createTemplate(
    "Template 1",
    "First template",
    "monthly",
    sampleExpenseData
  );
  
  const template2 = TemplateManager.createTemplate(
    "Template 2",
    "Second template",
    "weekly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template1);
  await TemplateManager.saveTemplate(template2);
  
  const templates = await TemplateManager.getAllTemplates();
  
  storageTest.assert(Array.isArray(templates), 'Should return array');
  storageTest.assertEqual(templates.length, 2, 'Should return two templates');
  
  const templateNames = templates.map(t => t.name);
  storageTest.assert(templateNames.includes("Template 1"), 'Should include Template 1');
  storageTest.assert(templateNames.includes("Template 2"), 'Should include Template 2');
});

// Test 13: Storage Usage Calculation
storageTest.test('Storage Usage Calculation', async () => {
  const template = TemplateManager.createTemplate(
    "Usage Test",
    "Test storage usage",
    "monthly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template);
  
  const usage = await TemplateManager.getStorageUsage();
  
  storageTest.assertEqual(usage.templateCount, 1, 'Should count 1 template');
  storageTest.assert(usage.totalSize > 0, 'Should have positive total size');
  storageTest.assert(usage.averageSize > 0, 'Should have positive average size');
  storageTest.assert(usage.percentageUsed >= 0, 'Should have valid percentage');
});

// Test 14: Clear All Templates
storageTest.test('Clear All Templates', async () => {
  const template1 = TemplateManager.createTemplate(
    "Clear Test 1",
    "First template",
    "monthly",
    sampleExpenseData
  );
  
  const template2 = TemplateManager.createTemplate(
    "Clear Test 2",
    "Second template",
    "weekly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template1);
  await TemplateManager.saveTemplate(template2);
  
  // Verify templates exist
  const beforeClear = await TemplateManager.getAllTemplates();
  storageTest.assertEqual(beforeClear.length, 2, 'Should have 2 templates before clear');
  
  // Clear all templates
  const result = await TemplateManager.clearAllTemplates();
  storageTest.assert(result.success, 'Clear operation should succeed');
  
  // Verify templates are cleared
  const afterClear = await TemplateManager.getAllTemplates();
  storageTest.assertEqual(afterClear.length, 0, 'Should have 0 templates after clear');
});

// Test 15: Export Templates
storageTest.test('Export Templates', async () => {
  const template = TemplateManager.createTemplate(
    "Export Test",
    "Test export",
    "monthly",
    sampleExpenseData
  );
  
  await TemplateManager.saveTemplate(template);
  
  const exportData = await TemplateManager.exportTemplates();
  
  storageTest.assert(typeof exportData === 'string', 'Export should return string');
  
  const parsedData = JSON.parse(exportData);
  storageTest.assert(parsedData.templates, 'Export should contain templates');
  storageTest.assert(parsedData.version, 'Export should contain version');
  storageTest.assert(parsedData.exportDate, 'Export should contain export date');
  storageTest.assertEqual(parsedData.templates.length, 1, 'Should export 1 template');
  storageTest.assertEqual(parsedData.templates[0].name, "Export Test", 'Should export correct template');
});

// Test 16: Import Templates
storageTest.test('Import Templates', async () => {
  const template = TemplateManager.createTemplate(
    "Import Test",
    "Test import",
    "monthly",
    sampleExpenseData
  );
  
  const importData = {
    version: 1,
    exportDate: new Date().toISOString(),
    templates: [template]
  };
  
  const result = await TemplateManager.importTemplates(JSON.stringify(importData));
  
  storageTest.assertEqual(result.success, 1, 'Should import 1 template');
  storageTest.assertEqual(result.failed, 0, 'Should have no failures');
  storageTest.assertEqual(result.skipped, 0, 'Should have no skipped');
  
  // Verify template was imported
  const importedTemplate = await TemplateManager.getTemplate(template.id);
  storageTest.assertEqual(importedTemplate.name, "Import Test", 'Should import correct template');
});

// Test 17: Storage Quota Simulation
storageTest.test('Storage Quota Simulation', async () => {
  // Create a large template that would exceed quota
  const largeTemplate = TemplateManager.createTemplate(
    "Large Template",
    "A".repeat(1000000), // 1MB description
    "monthly",
    sampleExpenseData
  );
  
  // Mock quota exceeded by setting a very large template
  const mockLargeStorage = {
    ...storageTest.mockStorage,
    data: {
      expenseTemplates: {
        'existing-large': {
          id: 'existing-large',
          name: 'Existing Large',
          description: 'B'.repeat(4000000), // 4MB template
          frequency: 'monthly',
          version: 1,
          expenseData: sampleExpenseData
        }
      }
    }
  };
  
  // Temporarily replace mock storage
  const originalMockStorage = storageTest.mockStorage;
  storageTest.mockStorage = mockLargeStorage;
  globalThis.chrome.storage.local = mockLargeStorage;
  
  try {
    await storageTest.assertThrows(
      () => TemplateManager.saveTemplate(largeTemplate),
      'Should throw quota exceeded error'
    );
  } finally {
    // Restore original mock storage
    storageTest.mockStorage = originalMockStorage;
    globalThis.chrome.storage.local = originalMockStorage;
  }
});

// Test 18: Concurrent Operations
storageTest.test('Concurrent Operations', async () => {
  const template1 = TemplateManager.createTemplate(
    "Concurrent Test 1",
    "First concurrent template",
    "monthly",
    sampleExpenseData
  );
  
  const template2 = TemplateManager.createTemplate(
    "Concurrent Test 2",
    "Second concurrent template",
    "weekly",
    sampleExpenseData
  );
  
  // Save both templates concurrently
  const [result1, result2] = await Promise.all([
    TemplateManager.saveTemplate(template1),
    TemplateManager.saveTemplate(template2)
  ]);
  
  storageTest.assert(result1.success, 'First template should save successfully');
  storageTest.assert(result2.success, 'Second template should save successfully');
  
  // Verify both templates exist
  const templates = await TemplateManager.getAllTemplates();
  storageTest.assertEqual(templates.length, 2, 'Should have 2 templates');
});

// Export test runner
if (typeof window !== 'undefined') {
  window.runStorageSystemTests = async function() {
    await storageTest.run();
    return storageTest.results;
  };
}

// Auto-run if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { storageTest };
}

console.log('📋 Storage System Test Suite Ready');
console.log('💡 Run tests with: await runStorageSystemTests()');