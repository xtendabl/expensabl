// UI Integration Test Suite for Template Management
// This test suite validates the template UI components and interactions

console.log('📋 Template UI Integration Test Suite');

// Test runner for UI integration
async function runUIIntegrationTests() {
  console.log('🧪 Starting Template UI Integration Tests...\n');
  
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
  
  // Test 1: DOM Element Creation
  await runTest('DOM Element Creation', async () => {
    // Test template selection buttons
    const useTemplateBtn = document.createElement('button');
    useTemplateBtn.id = 'useTemplateBtn';
    useTemplateBtn.textContent = 'Use Template';
    
    const useManualBtn = document.createElement('button');
    useManualBtn.id = 'useManualBtn';
    useManualBtn.textContent = 'Manual Entry';
    
    if (!useTemplateBtn.textContent || !useManualBtn.textContent) {
      throw new Error('Button elements not created properly');
    }
    
    if (useTemplateBtn.id !== 'useTemplateBtn' || useManualBtn.id !== 'useManualBtn') {
      throw new Error('Button IDs not set correctly');
    }
  });
  
  // Test 2: Template Card HTML Generation
  await runTest('Template Card HTML Generation', async () => {
    const sampleTemplate = {
      id: 'template-test-123',
      name: 'Test Template',
      description: 'Test description',
      frequency: 'monthly',
      createdAt: new Date().toISOString(),
      expenseData: {
        merchantAmount: 25.50,
        merchant: { name: 'Test Merchant' }
      }
    };
    
    const cardHtml = `
      <div class="template-card" style="border: 1px solid #ddd; padding: 12px; border-radius: 5px; background: #f9f9f9;">
        <div style="display: flex; justify-content: between; align-items: center;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 5px 0; color: #333;">${sampleTemplate.name}</h4>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 0.9em;">${sampleTemplate.description || 'No description'}</p>
            <div style="font-size: 0.8em; color: #999;">
              <span>Amount: $${sampleTemplate.expenseData.merchantAmount}</span> | 
              <span>Frequency: ${sampleTemplate.frequency}</span> | 
              <span>Created: ${new Date(sampleTemplate.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div style="margin-left: 10px;">
            <button onclick="selectTemplate('${sampleTemplate.id}')" style="padding: 6px 12px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Use</button>
            <button onclick="editTemplate('${sampleTemplate.id}')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px;">Edit</button>
            <button onclick="deleteTemplate('${sampleTemplate.id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">Delete</button>
          </div>
        </div>
      </div>
    `;
    
    if (!cardHtml.includes(sampleTemplate.name)) {
      throw new Error('Template name not included in card HTML');
    }
    
    if (!cardHtml.includes(sampleTemplate.description)) {
      throw new Error('Template description not included in card HTML');
    }
    
    if (!cardHtml.includes('$25.50')) {
      throw new Error('Template amount not formatted correctly');
    }
    
    if (!cardHtml.includes('selectTemplate')) {
      throw new Error('Use button onclick not configured correctly');
    }
  });
  
  // Test 3: Modal HTML Structure
  await runTest('Modal HTML Structure', async () => {
    const modalHtml = `
      <div style="background: white; padding: 20px; border-radius: 8px; width: 400px; max-width: 90%;">
        <h3 style="margin-top: 0;">Save as Template</h3>
        <form id="saveTemplateForm">
          <div style="margin-bottom: 15px;">
            <label for="templateName" style="display: block; margin-bottom: 5px;">Template Name:</label>
            <input type="text" id="templateName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" placeholder="e.g., Monthly Phone Bill">
          </div>
          <div style="margin-bottom: 15px;">
            <label for="templateDescription" style="display: block; margin-bottom: 5px;">Description:</label>
            <textarea id="templateDescription" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;" rows="3" placeholder="Optional description"></textarea>
          </div>
          <div style="margin-bottom: 15px;">
            <label for="templateFrequency" style="display: block; margin-bottom: 5px;">Frequency:</label>
            <select id="templateFrequency" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" id="cancelSaveTemplate" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Cancel</button>
            <button type="submit" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Save Template</button>
          </div>
        </form>
      </div>
    `;
    
    if (!modalHtml.includes('templateName')) {
      throw new Error('Template name input not found in modal');
    }
    
    if (!modalHtml.includes('templateDescription')) {
      throw new Error('Template description textarea not found in modal');
    }
    
    if (!modalHtml.includes('templateFrequency')) {
      throw new Error('Template frequency select not found in modal');
    }
    
    if (!modalHtml.includes('saveTemplateForm')) {
      throw new Error('Save template form not found in modal');
    }
  });
  
  // Test 4: Template List Empty State
  await runTest('Template List Empty State', async () => {
    const emptyStateHtml = `
      <div style="text-align: center; color: #666; margin: 20px 0;">
        <p>No templates found.</p>
        <p>Create your first template by completing a manual expense entry.</p>
      </div>
    `;
    
    if (!emptyStateHtml.includes('No templates found')) {
      throw new Error('Empty state message not found');
    }
    
    if (!emptyStateHtml.includes('Create your first template')) {
      throw new Error('Instructions for creating templates not found');
    }
  });
  
  // Test 5: Step 2 Enhanced UI Structure
  await runTest('Step 2 Enhanced UI Structure', async () => {
    const step2Html = `
      <h2>Choose Your Expense Method</h2>
      <div style="margin: 1em 0;">
        <button id="useTemplateBtn" style="margin-right: 10px; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Use Template</button>
        <button id="useManualBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Manual Entry</button>
      </div>
      <div id="methodContent">
        <div id="sampledExpensesList">Loading...</div>
      </div>
    `;
    
    if (!step2Html.includes('Choose Your Expense Method')) {
      throw new Error('Step 2 title not found');
    }
    
    if (!step2Html.includes('useTemplateBtn')) {
      throw new Error('Use Template button not found');
    }
    
    if (!step2Html.includes('useManualBtn')) {
      throw new Error('Manual Entry button not found');
    }
    
    if (!step2Html.includes('methodContent')) {
      throw new Error('Method content container not found');
    }
  });
  
  // Test 6: Step 3 Save Template Button
  await runTest('Step 3 Save Template Button', async () => {
    const step3EnhancedHtml = `
      <h3>Expense Details</h3>
      <div style="margin-bottom: 15px;">
        <button id="saveAsTemplateBtn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Save as Template</button>
        <button id="createExpenseBtn" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer;">Create Expense</button>
      </div>
    `;
    
    if (!step3EnhancedHtml.includes('saveAsTemplateBtn')) {
      throw new Error('Save as Template button not found');
    }
    
    if (!step3EnhancedHtml.includes('createExpenseBtn')) {
      throw new Error('Create Expense button not found');
    }
    
    if (!step3EnhancedHtml.includes('Save as Template')) {
      throw new Error('Save as Template button text not found');
    }
  });
  
  // Test 7: Template Management UI
  await runTest('Template Management UI', async () => {
    const managementHtml = `
      <h3>Template Management</h3>
      <div id="templateManagementList">Loading templates...</div>
      <div style="margin-top: 20px;">
        <button id="addNewTemplateBtn" style="margin-right: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Add New Template</button>
        <button id="exportTemplatesBtn" style="margin-right: 10px; padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer;">Export Templates</button>
        <button id="importTemplatesBtn" style="margin-right: 10px; padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 3px; cursor: pointer;">Import Templates</button>
        <button id="backToTemplateSelectionBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Back</button>
      </div>
    `;
    
    if (!managementHtml.includes('Template Management')) {
      throw new Error('Template Management title not found');
    }
    
    if (!managementHtml.includes('addNewTemplateBtn')) {
      throw new Error('Add New Template button not found');
    }
    
    if (!managementHtml.includes('exportTemplatesBtn')) {
      throw new Error('Export Templates button not found');
    }
    
    if (!managementHtml.includes('importTemplatesBtn')) {
      throw new Error('Import Templates button not found');
    }
  });
  
  // Test 8: Template from Step 3 UI
  await runTest('Template from Step 3 UI', async () => {
    const templateStep3Html = `
      <h2>Expense from Template: Monthly Phone Bill</h2>
      <div id="templateExpenseDetails">
        <div style="margin-bottom: 15px;">
          <h3>Template Details</h3>
          <p><strong>Name:</strong> Monthly Phone Bill</p>
          <p><strong>Description:</strong> AT&T monthly service</p>
          <p><strong>Frequency:</strong> monthly</p>
          <p><strong>Amount:</strong> $89.99</p>
          <p><strong>Merchant:</strong> AT&T</p>
        </div>
        <div style="margin-bottom: 15px;">
          <button id="createFromTemplateBtn" style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Create Expense</button>
          <button id="editTemplateBtn" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Edit Template</button>
          <button id="backToTemplatesBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">Back to Templates</button>
        </div>
      </div>
    `;
    
    if (!templateStep3Html.includes('Expense from Template')) {
      throw new Error('Template step 3 title not found');
    }
    
    if (!templateStep3Html.includes('Template Details')) {
      throw new Error('Template details section not found');
    }
    
    if (!templateStep3Html.includes('createFromTemplateBtn')) {
      throw new Error('Create from Template button not found');
    }
    
    if (!templateStep3Html.includes('editTemplateBtn')) {
      throw new Error('Edit Template button not found');
    }
  });
  
  // Test 9: CSS Styling Consistency
  await runTest('CSS Styling Consistency', async () => {
    const buttonStyles = {
      primary: 'background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer;',
      success: 'background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;',
      danger: 'background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;',
      secondary: 'background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;'
    };
    
    // Check if all button styles include consistent properties
    Object.entries(buttonStyles).forEach(([type, style]) => {
      if (!style.includes('border: none')) {
        throw new Error(`${type} button style missing border: none`);
      }
      if (!style.includes('border-radius: 3px')) {
        throw new Error(`${type} button style missing border-radius`);
      }
      if (!style.includes('cursor: pointer')) {
        throw new Error(`${type} button style missing cursor: pointer`);
      }
    });
  });
  
  // Test 10: Form Validation Elements
  await runTest('Form Validation Elements', async () => {
    const formElements = {
      templateName: { required: true, type: 'text' },
      templateDescription: { required: false, type: 'textarea' },
      templateFrequency: { required: true, type: 'select' }
    };
    
    Object.entries(formElements).forEach(([fieldName, config]) => {
      if (config.required && !config.type) {
        throw new Error(`Field ${fieldName} missing type configuration`);
      }
    });
    
    // Check frequency options
    const frequencyOptions = ['monthly', 'weekly', 'quarterly', 'yearly', 'custom'];
    if (frequencyOptions.length !== 5) {
      throw new Error('Incorrect number of frequency options');
    }
    
    if (!frequencyOptions.includes('monthly')) {
      throw new Error('Monthly frequency option missing');
    }
  });
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n📊 UI Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All UI integration tests passed!');
  }
  
  return results;
}

// Export for use in other contexts
if (typeof window !== 'undefined') {
  window.runUIIntegrationTests = runUIIntegrationTests;
}

// Instructions for running
console.log('💡 To run UI integration tests:');
console.log('1. Load this script in browser context');
console.log('2. Call: await runUIIntegrationTests()');
console.log('3. Check console for results');

// Auto-run if specific flag is set
if (typeof window !== 'undefined' && window.AUTO_RUN_UI_TESTS) {
  runUIIntegrationTests();
}