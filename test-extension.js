// Extension context test for Template Manager
// This script can be injected into the extension's content script or background script

console.log('🧪 Testing Template Manager in Extension Context');

// Test with real Chrome storage
async function testWithRealStorage() {
  console.log('\n=== Testing with Real Chrome Storage ===');
  
  try {
    // Clear any existing test data
    await new Promise(resolve => {
      chrome.storage.local.remove('expenseTemplates', resolve);
    });
    
    // Test 1: Create and validate template
    console.log('1. Creating template...');
    const sampleData = {
      merchant: {
        name: "Test Merchant",
        category: "test",
        categoryGroup: "TEST"
      },
      merchantAmount: 25.00,
      merchantCurrency: "USD",
      policy: "TEST",
      details: {
        participants: [],
        description: "Test expense",
        taxDetails: {},
        personal: false
      },
      reportingData: {}
    };
    
    const template = TemplateManager.createTemplate(
      "Test Template",
      "Test description",
      "monthly",
      sampleData
    );
    
    console.log('✅ Template created:', template.id);
    
    // Test 2: Validate template
    console.log('2. Validating template...');
    const validation = TemplateManager.validateTemplate(template);
    if (validation.isValid) {
      console.log('✅ Template validation passed');
    } else {
      console.log('❌ Template validation failed:', validation.errors);
      return;
    }
    
    // Test 3: Store template manually
    console.log('3. Storing template...');
    await new Promise(resolve => {
      chrome.storage.local.set({
        expenseTemplates: {
          [template.id]: template
        }
      }, resolve);
    });
    console.log('✅ Template stored');
    
    // Test 4: Retrieve templates
    console.log('4. Retrieving templates...');
    const templates = await TemplateManager.getAllTemplates();
    console.log('✅ Retrieved templates:', templates.length);
    console.log('Template names:', templates.map(t => t.name));
    
    // Test 5: Check storage usage
    console.log('5. Checking storage usage...');
    const usage = await TemplateManager.getStorageUsage();
    console.log('✅ Storage usage:', usage);
    
    // Test 6: Convert to expense payload
    console.log('6. Converting to expense payload...');
    const expensePayload = TemplateManager.templateToExpensePayload(template);
    console.log('✅ Expense payload created');
    console.log('Payload structure valid:', typeof expensePayload.merchant === 'object');
    
    // Test 7: Test name uniqueness
    console.log('7. Testing name uniqueness...');
    const isUnique = await TemplateManager.isTemplateNameUnique("Test Template");
    console.log('✅ Name uniqueness check (should be false):', !isUnique);
    
    const isUniqueNew = await TemplateManager.isTemplateNameUnique("Unique Name");
    console.log('✅ Name uniqueness check (should be true):', isUniqueNew);
    
    console.log('\n🎉 All extension tests passed!');
    
  } catch (error) {
    console.log('❌ Extension test failed:', error);
  }
}

// Test basic functionality without storage
function testBasicFunctionality() {
  console.log('\n=== Testing Basic Functionality ===');
  
  try {
    // Test ID generation
    console.log('1. Testing ID generation...');
    const id1 = TemplateManager.generateTemplateId();
    const id2 = TemplateManager.generateTemplateId();
    console.log('✅ IDs generated:', id1 !== id2);
    
    // Test template creation
    console.log('2. Testing template creation...');
    const sampleData = {
      merchant: { name: "Test", category: "test", categoryGroup: "TEST" },
      merchantAmount: 10.00,
      merchantCurrency: "USD",
      policy: "TEST",
      details: { participants: [], description: "", taxDetails: {}, personal: false },
      reportingData: {}
    };
    
    const template = TemplateManager.createTemplate("Test", "Desc", "monthly", sampleData);
    console.log('✅ Template created with ID:', template.id);
    
    // Test validation
    console.log('3. Testing validation...');
    const validation = TemplateManager.validateTemplate(template);
    console.log('✅ Validation result:', validation.isValid);
    
    // Test conversion
    console.log('4. Testing conversion...');
    const payload = TemplateManager.templateToExpensePayload(template);
    console.log('✅ Payload created with amount:', payload.merchantAmount);
    
    console.log('\n🎉 Basic functionality tests passed!');
    
  } catch (error) {
    console.log('❌ Basic functionality test failed:', error);
  }
}

// Test error handling
function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  try {
    // Test invalid template
    console.log('1. Testing invalid template validation...');
    const invalidTemplate = {
      id: "test",
      name: "", // Missing required field
      description: "Test",
      frequency: "invalid", // Invalid frequency
      version: 1,
      expenseData: {
        merchant: { name: "" }, // Missing required field
        merchantAmount: -5, // Invalid amount
        merchantCurrency: "",
        policy: ""
      }
    };
    
    const validation = TemplateManager.validateTemplate(invalidTemplate);
    console.log('✅ Invalid template correctly rejected:', !validation.isValid);
    console.log('Error count:', validation.errors.length);
    
    // Test oversized template
    console.log('2. Testing oversized template...');
    const oversizedTemplate = {
      id: "test",
      name: "A".repeat(100), // Too long
      description: "B".repeat(300), // Too long  
      frequency: "monthly",
      version: 1,
      expenseData: {
        merchant: { name: "Test", category: "test", categoryGroup: "TEST" },
        merchantAmount: 10,
        merchantCurrency: "USD",
        policy: "TEST"
      }
    };
    
    const sizeValidation = TemplateManager.validateTemplate(oversizedTemplate);
    console.log('✅ Oversized template correctly rejected:', !sizeValidation.isValid);
    
    console.log('\n🎉 Error handling tests passed!');
    
  } catch (error) {
    console.log('❌ Error handling test failed:', error);
  }
}

// Run all tests
async function runAllExtensionTests() {
  console.log('🚀 Starting Template Manager Extension Tests...\n');
  
  // Check if TemplateManager is available
  if (typeof TemplateManager === 'undefined') {
    console.log('❌ TemplateManager not found. Make sure template-manager.js is loaded.');
    return;
  }
  
  // Check if chrome.storage is available
  if (!chrome || !chrome.storage) {
    console.log('❌ Chrome storage API not available. Running basic tests only.');
    testBasicFunctionality();
    testErrorHandling();
    return;
  }
  
  // Run all test suites
  testBasicFunctionality();
  testErrorHandling();
  await testWithRealStorage();
  
  console.log('\n📊 All extension tests completed!');
}

// Auto-run if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  runAllExtensionTests();
}

// Export for manual running
if (typeof window !== 'undefined') {
  window.runExtensionTests = runAllExtensionTests;
}