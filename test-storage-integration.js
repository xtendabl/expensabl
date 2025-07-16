// Integration tests for template storage system with real Chrome storage
// Run these tests in Chrome extension context

console.log('🔧 Chrome Storage Integration Tests');

// Test runner for Chrome extension environment
async function runStorageIntegrationTests() {
  console.log('🧪 Starting Chrome Storage Integration Tests...\n');
  
  // Check if Chrome storage is available
  if (!chrome || !chrome.storage) {
    console.log('❌ Chrome storage API not available');
    return [];
  }
  
  // Check if TemplateManager is available
  if (typeof TemplateManager === 'undefined') {
    console.log('❌ TemplateManager not found. Make sure template-manager.js is loaded.');
    return [];
  }
  
  const results = [];
  
  // Test data
  const sampleExpenseData = {
    merchant: {
      name: "Integration Test Merchant",
      category: "test",
      categoryGroup: "TEST",
      online: false,
      perDiem: false,
      timeZone: "Z",
      formattedAddress: "",
      description: ""
    },
    merchantAmount: 35.50,
    merchantCurrency: "USD",
    policy: "TEST",
    details: {
      participants: [],
      description: "Integration test expense",
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
  
  // Clean up before tests
  console.log('🧹 Cleaning up existing test data...');
  try {
    await TemplateManager.clearAllTemplates();
  } catch (error) {
    console.log('Warning: Could not clear templates:', error.message);
  }
  
  // Test 1: Real Chrome Storage - Save and Retrieve
  await runTest('Real Chrome Storage - Save and Retrieve', async () => {
    const template = TemplateManager.createTemplate(
      "Chrome Storage Test",
      "Test with real Chrome storage",
      "monthly",
      sampleExpenseData
    );
    
    // Save template
    const saveResult = await TemplateManager.saveTemplate(template);
    if (!saveResult.success) {
      throw new Error('Failed to save template');
    }
    
    // Retrieve template
    const retrievedTemplate = await TemplateManager.getTemplate(template.id);
    if (retrievedTemplate.name !== "Chrome Storage Test") {
      throw new Error('Retrieved template name does not match');
    }
    
    if (retrievedTemplate.description !== "Test with real Chrome storage") {
      throw new Error('Retrieved template description does not match');
    }
  });
  
  // Test 2: Real Chrome Storage - Multiple Templates
  await runTest('Real Chrome Storage - Multiple Templates', async () => {
    const template1 = TemplateManager.createTemplate(
      "Multi Test 1",
      "First template",
      "monthly",
      sampleExpenseData
    );
    
    const template2 = TemplateManager.createTemplate(
      "Multi Test 2",
      "Second template",
      "weekly",
      sampleExpenseData
    );
    
    // Save both templates
    await TemplateManager.saveTemplate(template1);
    await TemplateManager.saveTemplate(template2);
    
    // Retrieve all templates
    const allTemplates = await TemplateManager.getAllTemplates();
    if (allTemplates.length !== 2) {
      throw new Error(`Expected 2 templates, got ${allTemplates.length}`);
    }
    
    const names = allTemplates.map(t => t.name);
    if (!names.includes("Multi Test 1") || !names.includes("Multi Test 2")) {
      throw new Error('Not all templates found in results');
    }
  });
  
  // Test 3: Real Chrome Storage - Update Template
  await runTest('Real Chrome Storage - Update Template', async () => {
    const template = TemplateManager.createTemplate(
      "Update Test",
      "Original description",
      "monthly",
      sampleExpenseData
    );
    
    // Save template
    await TemplateManager.saveTemplate(template);
    
    // Update template
    const updatedData = {
      ...template,
      name: "Updated Test",
      description: "Updated description",
      frequency: "weekly"
    };
    
    const updateResult = await TemplateManager.updateTemplate(template.id, updatedData);
    if (!updateResult.success) {
      throw new Error('Failed to update template');
    }
    
    // Verify update
    const updatedTemplate = await TemplateManager.getTemplate(template.id);
    if (updatedTemplate.name !== "Updated Test") {
      throw new Error('Template name was not updated');
    }
    
    if (updatedTemplate.description !== "Updated description") {
      throw new Error('Template description was not updated');
    }
    
    if (updatedTemplate.frequency !== "weekly") {
      throw new Error('Template frequency was not updated');
    }
  });
  
  // Test 4: Real Chrome Storage - Delete Template
  await runTest('Real Chrome Storage - Delete Template', async () => {
    const template = TemplateManager.createTemplate(
      "Delete Test",
      "Template to delete",
      "monthly",
      sampleExpenseData
    );
    
    // Save template
    await TemplateManager.saveTemplate(template);
    
    // Verify it exists
    const existingTemplate = await TemplateManager.getTemplate(template.id);
    if (!existingTemplate) {
      throw new Error('Template was not saved properly');
    }
    
    // Delete template
    const deleteResult = await TemplateManager.deleteTemplate(template.id);
    if (!deleteResult.success) {
      throw new Error('Failed to delete template');
    }
    
    // Verify it's gone
    try {
      await TemplateManager.getTemplate(template.id);
      throw new Error('Template still exists after deletion');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
  });
  
  // Test 5: Real Chrome Storage - Name Uniqueness
  await runTest('Real Chrome Storage - Name Uniqueness', async () => {
    const template1 = TemplateManager.createTemplate(
      "Unique Name Test",
      "First template",
      "monthly",
      sampleExpenseData
    );
    
    const template2 = TemplateManager.createTemplate(
      "Unique Name Test",
      "Second template",
      "weekly",
      sampleExpenseData
    );
    
    // Save first template
    await TemplateManager.saveTemplate(template1);
    
    // Try to save second template with same name
    try {
      await TemplateManager.saveTemplate(template2);
      throw new Error('Should have thrown name uniqueness error');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  });
  
  // Test 6: Real Chrome Storage - Storage Usage
  await runTest('Real Chrome Storage - Storage Usage', async () => {
    // Clear existing templates
    await TemplateManager.clearAllTemplates();
    
    // Check empty storage usage
    const emptyUsage = await TemplateManager.getStorageUsage();
    if (emptyUsage.templateCount !== 0) {
      throw new Error('Empty storage should have 0 templates');
    }
    
    // Add templates and check usage
    const template1 = TemplateManager.createTemplate(
      "Usage Test 1",
      "First template",
      "monthly",
      sampleExpenseData
    );
    
    const template2 = TemplateManager.createTemplate(
      "Usage Test 2",
      "Second template",
      "weekly",
      sampleExpenseData
    );
    
    await TemplateManager.saveTemplate(template1);
    await TemplateManager.saveTemplate(template2);
    
    const usage = await TemplateManager.getStorageUsage();
    if (usage.templateCount !== 2) {
      throw new Error(`Expected 2 templates, got ${usage.templateCount}`);
    }
    
    if (usage.totalSize <= 0) {
      throw new Error('Total size should be positive');
    }
    
    if (usage.averageSize <= 0) {
      throw new Error('Average size should be positive');
    }
  });
  
  // Test 7: Real Chrome Storage - Export/Import
  await runTest('Real Chrome Storage - Export/Import', async () => {
    // Clear existing templates
    await TemplateManager.clearAllTemplates();
    
    // Create test template
    const template = TemplateManager.createTemplate(
      "Export/Import Test",
      "Test export and import",
      "monthly",
      sampleExpenseData
    );
    
    await TemplateManager.saveTemplate(template);
    
    // Export templates
    const exportData = await TemplateManager.exportTemplates();
    if (typeof exportData !== 'string') {
      throw new Error('Export should return string');
    }
    
    // Clear templates
    await TemplateManager.clearAllTemplates();
    
    // Verify templates are cleared
    const emptyTemplates = await TemplateManager.getAllTemplates();
    if (emptyTemplates.length !== 0) {
      throw new Error('Templates should be cleared before import');
    }
    
    // Import templates
    const importResult = await TemplateManager.importTemplates(exportData);
    if (importResult.success !== 1) {
      throw new Error('Import should succeed for 1 template');
    }
    
    // Verify imported template
    const importedTemplates = await TemplateManager.getAllTemplates();
    if (importedTemplates.length !== 1) {
      throw new Error('Should have 1 imported template');
    }
    
    if (importedTemplates[0].name !== "Export/Import Test") {
      throw new Error('Imported template name does not match');
    }
  });
  
  // Test 8: Real Chrome Storage - Error Handling
  await runTest('Real Chrome Storage - Error Handling', async () => {
    // Test invalid template ID
    try {
      await TemplateManager.getTemplate("invalid-id");
      throw new Error('Should have thrown not found error');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
    
    // Test invalid template data
    const invalidTemplate = {
      id: "invalid-template",
      name: "", // Invalid name
      description: "Test",
      frequency: "invalid", // Invalid frequency
      version: 1,
      expenseData: {
        merchant: { name: "" }, // Invalid merchant name
        merchantAmount: -10, // Invalid amount
        merchantCurrency: "",
        policy: ""
      }
    };
    
    try {
      await TemplateManager.saveTemplate(invalidTemplate);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      if (!error.message.includes('validation failed')) {
        throw error;
      }
    }
  });
  
  // Test 9: Real Chrome Storage - Persistence Across Sessions
  await runTest('Real Chrome Storage - Persistence Check', async () => {
    const template = TemplateManager.createTemplate(
      "Persistence Test",
      "Test template persistence",
      "monthly",
      sampleExpenseData
    );
    
    // Save template
    await TemplateManager.saveTemplate(template);
    
    // Simulate checking persistence by directly accessing Chrome storage
    const storageData = await new Promise((resolve, reject) => {
      chrome.storage.local.get('expenseTemplates', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
    
    if (!storageData.expenseTemplates) {
      throw new Error('Templates not found in Chrome storage');
    }
    
    if (!storageData.expenseTemplates[template.id]) {
      throw new Error('Specific template not found in Chrome storage');
    }
    
    const storedTemplate = storageData.expenseTemplates[template.id];
    if (storedTemplate.name !== "Persistence Test") {
      throw new Error('Stored template name does not match');
    }
  });
  
  // Test 10: Real Chrome Storage - Large Template Handling
  await runTest('Real Chrome Storage - Large Template Handling', async () => {
    // Create a reasonably large template (not exceeding quota)
    const largeDescription = "A".repeat(1000); // 1KB description
    const largeTemplate = TemplateManager.createTemplate(
      "Large Template Test",
      largeDescription,
      "monthly",
      sampleExpenseData
    );
    
    // Save large template
    const saveResult = await TemplateManager.saveTemplate(largeTemplate);
    if (!saveResult.success) {
      throw new Error('Failed to save large template');
    }
    
    // Retrieve and verify
    const retrievedTemplate = await TemplateManager.getTemplate(largeTemplate.id);
    if (retrievedTemplate.description !== largeDescription) {
      throw new Error('Large template description was not preserved');
    }
  });
  
  // Clean up after tests
  console.log('\n🧹 Cleaning up test data...');
  try {
    await TemplateManager.clearAllTemplates();
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.log('⚠️  Test cleanup warning:', error.message);
  }
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n📊 Chrome Storage Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All Chrome storage integration tests passed!');
  }
  
  return results;
}

// Export for use in other contexts
if (typeof window !== 'undefined') {
  window.runStorageIntegrationTests = runStorageIntegrationTests;
}

// Instructions for running
console.log('💡 To run Chrome storage integration tests:');
console.log('1. Load this script in Chrome extension context');
console.log('2. Call: await runStorageIntegrationTests()');
console.log('3. Check console for results');

// Auto-run if specific flag is set
if (typeof window !== 'undefined' && window.AUTO_RUN_INTEGRATION_TESTS) {
  runStorageIntegrationTests();
}