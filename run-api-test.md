# How to Test Navan API Parameters

## Method 1: Standalone Node.js Script (Recommended)

1. **Get your authentication token:**
   - Open Chrome DevTools (F12)
   - Go to the Network tab
   - Log into Navan (app.navan.com)
   - Look for any API request to `app.navan.com/api/liquid/`
   - In the Request Headers, find the `authorization` header
   - Copy the entire value (starts with `TripActions eyJ...`)

2. **Update the test script:**
   ```bash
   # Edit the test-api-params.js file
   # Replace 'TripActions YOUR_TOKEN_HERE' with your actual token
   ```

3. **Run the test:**
   ```bash
   node test-api-params.js
   ```

   This will test all parameters and show you:
   - Which parameters work (✓)
   - Which parameters fail (✗)
   - How many results each parameter returns
   - A suggested TypeScript interface update

## Method 2: Through the Chrome Extension

1. **Open the Chrome Extension page:**
   - Go to `chrome://extensions/`
   - Find "Expensabl" extension
   - Note the extension ID

2. **Open the Chrome DevTools Console** on any page

3. **Send a test message to the extension:**
   ```javascript
   chrome.runtime.sendMessage(
     'YOUR_EXTENSION_ID', // Replace with your extension ID
     { action: 'testApiParameters' },
     function(response) {
       if (response.success) {
         console.log('Test Results:', response.data.report);
         console.log('Detailed Results:', response.data.results);
       } else {
         console.error('Test failed:', response.error);
       }
     }
   );
   ```

## Method 3: Using curl with your token

Test individual parameters manually:

```bash
# Test a specific parameter
curl 'https://app.navan.com/api/liquid/user/search/transactions?q=Delta&limit=5' \
  -H 'authorization: TripActions YOUR_TOKEN_HERE' \
  -H 'accept: application/json' \
  -H 'x-timezone: America/Los_Angeles'
```

## Currently Known Working Parameters

Based on the Navan API and your existing code:

- `q` - Query string for merchant name search
- `authorizationInstant.from` - Start date (ISO format)
- `authorizationInstant.to` - End date (ISO format)

The test will help discover additional supported parameters.