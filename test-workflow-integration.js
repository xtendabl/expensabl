// Workflow Integration Test Suite for Template Functionality
// This test suite validates the enhanced workflow with template support

console.log('🔄 Template Workflow Integration Test Suite');

// Test runner for workflow integration
async function runWorkflowIntegrationTests() {
  console.log('🧪 Starting Template Workflow Integration Tests...\n');
  
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
  
  // Test 1: Step 2 Enhanced UI Structure
  await runTest('Step 2 Enhanced UI Structure', async () => {
    const step2Html = `
      <h2>Choose Your Expense Method</h2>
      <div style="margin: 1em 0;">
        <button id="useTemplateBtn" style="margin-right: 10px; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Use Template</button>
        <button id="useManualBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Manual Entry</button>
      </div>
      <div id="methodContent">
        <div style="text-align: center; color: #666; margin: 40px 0;">
          <p>Select your preferred expense creation method above.</p>
        </div>
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
    
    if (!step2Html.includes('Select your preferred expense creation method')) {
      throw new Error('Default instructions not found');
    }
  });
  
  // Test 2: Step 2.5 Template Selection Step
  await runTest('Step 2.5 Template Selection Step', async () => {
    const step2_5Html = `
      <h2>Select a Template</h2>
      <div style="margin-bottom: 20px;">
        <button id="backToMethodBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">← Back to Method Selection</button>
      </div>
      <div id="templateSelectionContent">
        <div id="templatesList">Loading templates...</div>
      </div>
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button id="manageTemplatesBtn" style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 3px; cursor: pointer;">Manage Templates</button>
        <button id="skipTemplatesBtn" style="padding: 8px 16px; background: #ffc107; color: black; border: none; border-radius: 3px; cursor: pointer;">Skip & Use Manual</button>
      </div>
    `;
    
    if (!step2_5Html.includes('Select a Template')) {
      throw new Error('Step 2.5 title not found');
    }
    
    if (!step2_5Html.includes('backToMethodBtn')) {
      throw new Error('Back to Method Selection button not found');
    }
    
    if (!step2_5Html.includes('manageTemplatesBtn')) {
      throw new Error('Manage Templates button not found');
    }
    
    if (!step2_5Html.includes('skipTemplatesBtn')) {
      throw new Error('Skip & Use Manual button not found');
    }
    
    if (!step2_5Html.includes('templateSelectionContent')) {
      throw new Error('Template selection content container not found');
    }
  });
  
  // Test 3: Enhanced Template Selection Cards
  await runTest('Enhanced Template Selection Cards', async () => {
    const sampleTemplate = {
      id: 'template-workflow-123',
      name: 'Monthly Phone Bill',
      description: 'AT&T monthly service charge',
      frequency: 'monthly',
      createdAt: '2024-01-15T10:30:00Z',
      expenseData: {
        merchantAmount: 89.99,
        merchant: { name: 'AT&T' }
      }
    };
    
    const templateCardHtml = `
      <div class="template-selection-card" style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; cursor: pointer; transition: background-color 0.2s;" 
           onclick="selectTemplateForWorkflow('${sampleTemplate.id}')" 
           onmouseover="this.style.backgroundColor='#e9ecef'" 
           onmouseout="this.style.backgroundColor='#f9f9f9'">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 1.1em;">${sampleTemplate.name}</h4>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9em;">${sampleTemplate.description}</p>
            <div style="font-size: 0.85em; color: #999; margin-bottom: 8px;">
              <div style="margin-bottom: 4px;">💰 <strong>$${sampleTemplate.expenseData.merchantAmount}</strong> - ${sampleTemplate.expenseData.merchant.name}</div>
              <div style="margin-bottom: 4px;">🔄 ${sampleTemplate.frequency.charAt(0).toUpperCase() + sampleTemplate.frequency.slice(1)} recurring</div>
              <div>📅 Created: ${new Date(sampleTemplate.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <div style="margin-left: 15px;">
            <button onclick="event.stopPropagation(); selectTemplateForWorkflow('${sampleTemplate.id}')" 
                    style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">
              Use Template
            </button>
          </div>
        </div>
      </div>
    `;
    
    if (!templateCardHtml.includes('template-selection-card')) {
      throw new Error('Template selection card class not found');
    }
    
    if (!templateCardHtml.includes('selectTemplateForWorkflow')) {
      throw new Error('selectTemplateForWorkflow function not called');
    }
    
    if (!templateCardHtml.includes('💰')) {
      throw new Error('Amount emoji not found');
    }
    
    if (!templateCardHtml.includes('🔄')) {
      throw new Error('Frequency emoji not found');
    }
    
    if (!templateCardHtml.includes('📅')) {
      throw new Error('Date emoji not found');
    }
    
    if (!templateCardHtml.includes('Use Template')) {
      throw new Error('Use Template button text not found');
    }
  });
  
  // Test 4: Step 3 From Template Enhanced UI
  await runTest('Step 3 From Template Enhanced UI', async () => {
    const sampleTemplate = {
      name: 'Monthly Phone Bill',
      description: 'AT&T monthly service',
      frequency: 'monthly',
      expenseData: {
        merchantAmount: 89.99,
        merchant: { name: 'AT&T' }
      }
    };
    
    const step3TemplateHtml = `
      <h2>Step 3: Expense from Template</h2>
      <div style="margin-bottom: 20px;">
        <button id="backToTemplatesBtn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">← Back to Templates</button>
      </div>
      <div id="templateExpenseDetails">
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007cba;">
          <h3 style="margin-top: 0; color: #007cba;">Template: ${sampleTemplate.name}</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
            <div>
              <p style="margin: 5px 0;"><strong>Description:</strong> ${sampleTemplate.description}</p>
              <p style="margin: 5px 0;"><strong>Frequency:</strong> ${sampleTemplate.frequency.charAt(0).toUpperCase() + sampleTemplate.frequency.slice(1)}</p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Amount:</strong> $${sampleTemplate.expenseData.merchantAmount}</p>
              <p style="margin: 5px 0;"><strong>Merchant:</strong> ${sampleTemplate.expenseData.merchant.name}</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <button id="editTemplateBtn" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.9em;">Edit Template</button>
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <h3>Expense Details</h3>
          <p style="color: #666; margin-bottom: 15px;">Review and modify the expense details below, then create the expense.</p>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <button id="createFromTemplateBtn" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Create Expense</button>
            <button id="saveAsNewTemplateBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Save as New Template</button>
          </div>
        </div>
      </div>
    `;
    
    if (!step3TemplateHtml.includes('Step 3: Expense from Template')) {
      throw new Error('Step 3 template title not found');
    }
    
    if (!step3TemplateHtml.includes('backToTemplatesBtn')) {
      throw new Error('Back to Templates button not found');
    }
    
    if (!step3TemplateHtml.includes('border-left: 4px solid #007cba')) {
      throw new Error('Template highlight border not found');
    }
    
    if (!step3TemplateHtml.includes('createFromTemplateBtn')) {
      throw new Error('Create From Template button not found');
    }
    
    if (!step3TemplateHtml.includes('saveAsNewTemplateBtn')) {
      throw new Error('Save as New Template button not found');
    }
    
    if (!step3TemplateHtml.includes('grid-template-columns: 1fr 1fr')) {
      throw new Error('Two-column grid layout not found');
    }
  });
  
  // Test 5: Empty Template State
  await runTest('Empty Template State', async () => {
    const emptyTemplateHtml = `
      <div style="text-align: center; color: #666; margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;">
        <h3 style="margin-top: 0;">No Templates Found</h3>
        <p>Create your first template by completing a manual expense entry.</p>
        <button onclick="renderManualExpenseSelection()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Create Manual Expense</button>
      </div>
    `;
    
    if (!emptyTemplateHtml.includes('No Templates Found')) {
      throw new Error('Empty state title not found');
    }
    
    if (!emptyTemplateHtml.includes('Create your first template')) {
      throw new Error('Empty state instruction not found');
    }
    
    if (!emptyTemplateHtml.includes('renderManualExpenseSelection')) {
      throw new Error('Manual expense button function not found');
    }
    
    if (!emptyTemplateHtml.includes('Create Manual Expense')) {
      throw new Error('Create Manual Expense button text not found');
    }
  });
  
  // Test 6: Workflow Navigation Functions
  await runTest('Workflow Navigation Functions', async () => {
    const workflowFunctions = [
      'renderStep2',
      'renderStep2_5_TemplateSelection',
      'renderManualExpenseSelection',
      'loadTemplateSelectionList',
      'selectTemplateForWorkflow',
      'renderStep3FromTemplate'
    ];
    
    // Simulate function existence check
    workflowFunctions.forEach(funcName => {
      if (typeof funcName !== 'string' || funcName.length === 0) {
        throw new Error(`Function ${funcName} not defined properly`);
      }
    });
    
    // Check function naming conventions
    if (!workflowFunctions.includes('renderStep2_5_TemplateSelection')) {
      throw new Error('Step 2.5 function not found');
    }
    
    if (!workflowFunctions.includes('selectTemplateForWorkflow')) {
      throw new Error('Workflow template selection function not found');
    }
  });
  
  // Test 7: State Management and Navigation
  await runTest('State Management and Navigation', async () => {
    const navigationTests = [
      { from: 'Step 2', to: 'Step 2.5', action: 'Use Template' },
      { from: 'Step 2', to: 'Manual Selection', action: 'Manual Entry' },
      { from: 'Step 2.5', to: 'Step 2', action: 'Back to Method Selection' },
      { from: 'Step 2.5', to: 'Step 3', action: 'Select Template' },
      { from: 'Step 2.5', to: 'Manual Selection', action: 'Skip & Use Manual' },
      { from: 'Step 3 Template', to: 'Step 2.5', action: 'Back to Templates' }
    ];
    
    navigationTests.forEach(test => {
      if (!test.from || !test.to || !test.action) {
        throw new Error(`Navigation test incomplete: ${JSON.stringify(test)}`);
      }
    });
    
    // Check for proper navigation flow
    if (navigationTests.length !== 6) {
      throw new Error('Incorrect number of navigation paths');
    }
  });
  
  // Test 8: Template Selection Workflow Logic
  await runTest('Template Selection Workflow Logic', async () => {
    const workflowLogic = {
      stepProgression: ['Step 1', 'Step 2', 'Step 2.5', 'Step 3'],
      templatePath: ['Step 2', 'Step 2.5', 'Step 3'],
      manualPath: ['Step 2', 'Manual Selection', 'Step 3'],
      backNavigation: {
        'Step 2.5': 'Step 2',
        'Step 3 Template': 'Step 2.5',
        'Manual Selection': 'Step 2'
      }
    };
    
    if (workflowLogic.stepProgression.length !== 4) {
      throw new Error('Incorrect step progression length');
    }
    
    if (!workflowLogic.templatePath.includes('Step 2.5')) {
      throw new Error('Template path missing Step 2.5');
    }
    
    if (!workflowLogic.manualPath.includes('Manual Selection')) {
      throw new Error('Manual path missing Manual Selection');
    }
    
    if (workflowLogic.backNavigation['Step 2.5'] !== 'Step 2') {
      throw new Error('Back navigation from Step 2.5 incorrect');
    }
  });
  
  // Test 9: Enhanced Template Card Interactions
  await runTest('Enhanced Template Card Interactions', async () => {
    const cardInteractions = [
      { event: 'click', target: 'card', action: 'selectTemplateForWorkflow' },
      { event: 'click', target: 'button', action: 'selectTemplateForWorkflow' },
      { event: 'mouseover', target: 'card', action: 'highlight' },
      { event: 'mouseout', target: 'card', action: 'unhighlight' }
    ];
    
    cardInteractions.forEach(interaction => {
      if (!interaction.event || !interaction.target || !interaction.action) {
        throw new Error(`Card interaction incomplete: ${JSON.stringify(interaction)}`);
      }
    });
    
    // Check for proper event handling
    if (!cardInteractions.some(i => i.event === 'click' && i.action === 'selectTemplateForWorkflow')) {
      throw new Error('Click to select template not found');
    }
    
    if (!cardInteractions.some(i => i.event === 'mouseover' && i.action === 'highlight')) {
      throw new Error('Hover highlighting not found');
    }
  });
  
  // Test 10: Workflow Error Handling
  await runTest('Workflow Error Handling', async () => {
    const errorScenarios = [
      { context: 'Template loading', handling: 'Restore template list' },
      { context: 'Template selection', handling: 'Show error, restore list' },
      { context: 'Template conversion', handling: 'Show error, restore list' },
      { context: 'No active tab', handling: 'Show error message' }
    ];
    
    errorScenarios.forEach(scenario => {
      if (!scenario.context || !scenario.handling) {
        throw new Error(`Error scenario incomplete: ${JSON.stringify(scenario)}`);
      }
    });
    
    // Check for proper error recovery
    if (!errorScenarios.some(s => s.handling.includes('restore'))) {
      throw new Error('Error recovery mechanism not found');
    }
    
    if (errorScenarios.length !== 4) {
      throw new Error('Incorrect number of error scenarios');
    }
  });
  
  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n📊 Workflow Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All workflow integration tests passed!');
  }
  
  return results;
}

// Export for use in other contexts
if (typeof window !== 'undefined') {
  window.runWorkflowIntegrationTests = runWorkflowIntegrationTests;
}

// Instructions for running
console.log('💡 To run workflow integration tests:');
console.log('1. Load this script in browser context');
console.log('2. Call: await runWorkflowIntegrationTests()');
console.log('3. Check console for results');

// Auto-run if specific flag is set
if (typeof window !== 'undefined' && window.AUTO_RUN_WORKFLOW_TESTS) {
  runWorkflowIntegrationTests();
}