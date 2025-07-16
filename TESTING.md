# Testing Guide for Template Manager

## Overview
This guide provides instructions for testing the Template Manager implementation before proceeding to task-2.

## Test Files Created
1. **`test-template-manager.js`** - Comprehensive unit tests with mock storage
2. **`test-runner.html`** - Browser-based test runner with UI
3. **`test-extension.js`** - Extension context tests with real Chrome storage
4. **`TESTING.md`** - This testing guide

## Testing Methods

### Method 1: Browser Test Runner (Recommended)
1. Open `test-runner.html` in a web browser
2. Click "Run All Tests" to execute the full test suite
3. View results in the console output and test summary
4. Use "Run Manual Test" for step-by-step testing

**What it tests:**
- ✅ Template ID generation
- ✅ Template creation and validation
- ✅ Data sanitization
- ✅ Storage integration (mocked)
- ✅ Error handling
- ✅ Template-to-expense conversion

### Method 2: Chrome Extension Context Testing
1. Load the extension in Chrome (`chrome://extensions/`)
2. Open Chrome DevTools in the extension context
3. Copy and paste the contents of `test-extension.js` into the console
4. Or include the script in your extension and call `runExtensionTests()`

**What it tests:**
- ✅ Real Chrome storage integration
- ✅ Extension environment compatibility
- ✅ Full template lifecycle
- ✅ Storage quota and usage

### Method 3: Manual Testing in Extension
1. Load the extension in Chrome
2. Open the side panel
3. Create a test expense template:
   ```javascript
   // In DevTools console:
   const sampleData = {
     merchant: { name: "Test Merchant", category: "test", categoryGroup: "TEST" },
     merchantAmount: 25.00,
     merchantCurrency: "USD",
     policy: "TEST",
     details: { participants: [], description: "Test", taxDetails: {}, personal: false },
     reportingData: {}
   };
   
   const template = TemplateManager.createTemplate("Test Template", "Description", "monthly", sampleData);
   console.log(template);
   ```

## Test Coverage

### ✅ Core Functionality
- [x] Template ID generation (unique, correct format)
- [x] Template creation from expense data
- [x] Data sanitization and structure preservation
- [x] Template validation (required fields, data types, size limits)
- [x] Template-to-expense payload conversion
- [x] Nested value retrieval utility

### ✅ Storage Integration
- [x] Mock storage operations (get, set, clear)
- [x] Template retrieval and storage
- [x] Storage usage calculation
- [x] Template name uniqueness checking
- [x] Real Chrome storage integration

### ✅ Error Handling
- [x] Invalid template validation
- [x] Missing required fields
- [x] Invalid data types
- [x] Size limit violations
- [x] Storage permission errors
- [x] Network/connectivity issues

### ✅ Business Logic
- [x] Template name uniqueness enforcement
- [x] Frequency validation
- [x] Currency code validation
- [x] Amount validation (positive numbers)
- [x] Schema versioning support

## Expected Test Results

### Successful Test Run Should Show:
```
🧪 Starting Template Manager Tests...

✅ Template ID Generation
✅ Template Creation
✅ Data Sanitization
✅ Template Validation - Valid Template
✅ Template Validation - Missing Required Fields
✅ Template Validation - Invalid Values
✅ Template Validation - Size Limits
✅ Nested Value Getter
✅ Template to Expense Payload Conversion
✅ Storage Integration (Mock)
✅ Storage Usage Calculation (Mock)
✅ Template Name Uniqueness (Mock)

📊 Test Results: 12 passed, 0 failed
```

## Common Issues and Solutions

### Issue: "TemplateManager is not defined"
**Solution:** Make sure `template-manager.js` is loaded before the test files.

### Issue: "Chrome storage API not available"
**Solution:** Run tests in Chrome extension context or use the mock storage tests.

### Issue: Tests fail with storage errors
**Solution:** Check Chrome extension permissions include "storage" in manifest.json.

### Issue: Template validation fails unexpectedly
**Solution:** Verify sample data matches the expected schema structure.

## Performance Benchmarks

### Expected Performance:
- Template creation: < 1ms
- Template validation: < 5ms  
- Storage operations: < 10ms
- Template conversion: < 1ms

### Memory Usage:
- Template storage: ~2-4KB per template
- Maximum templates: ~1,000 (within 5MB quota)

## Next Steps After Testing

### If All Tests Pass ✅
- Proceed to task-2 (Implement template storage system)
- Template data model is ready for integration

### If Tests Fail ❌
- Review failed test cases
- Fix issues in `template-manager.js`
- Re-run tests until all pass
- Document any changes made

## Manual Verification Checklist

Before moving to task-2, verify:

- [ ] Template creation works with valid data
- [ ] Template validation rejects invalid data
- [ ] Storage integration works in extension context
- [ ] Template-to-expense conversion produces correct payload
- [ ] Name uniqueness is enforced
- [ ] Storage usage calculations are accurate
- [ ] Error handling works for edge cases
- [ ] Performance meets expected benchmarks

## Troubleshooting

### Debug Mode
Add this to enable detailed logging:
```javascript
// Enable debug logging
TemplateManager.debug = true;
```

### Storage Inspection
Check storage contents:
```javascript
// In Chrome DevTools
chrome.storage.local.get('expenseTemplates', (result) => {
  console.log('Templates in storage:', result.expenseTemplates);
});
```

### Clear Test Data
```javascript
// Clear all test templates
chrome.storage.local.remove('expenseTemplates', () => {
  console.log('Test data cleared');
});
```