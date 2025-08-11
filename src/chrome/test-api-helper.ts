/**
 * Helper module to test API parameters from the extension's side panel
 * This can be run from the side panel's console
 */

interface ApiTestResult {
  parameter: string;
  value: string | number | boolean;
  status: 'success' | 'error';
  message?: string;
  responseCode?: number;
}

interface ApiTestResponse {
  success: boolean;
  error?: string;
  data?: {
    report: string;
    results: ApiTestResult[];
  };
}

export async function testApiParameters(): Promise<ApiTestResult[] | void> {
  // eslint-disable-next-line no-console
  console.log('🔍 Starting Navan API parameter test...');
  // eslint-disable-next-line no-console
  console.log('This will test which query parameters work with /search/transactions');
  // eslint-disable-next-line no-console
  console.log('Please wait, this may take a minute...\n');

  try {
    const response = (await chrome.runtime.sendMessage({
      action: 'testApiParameters',
    })) as ApiTestResponse;

    if (!response || !response.success) {
      // eslint-disable-next-line no-console
      console.error('❌ Test failed:', response?.error || 'No response received');
      // eslint-disable-next-line no-console
      console.log('\nTroubleshooting:');
      // eslint-disable-next-line no-console
      console.log('1. Make sure you are logged into Navan');
      // eslint-disable-next-line no-console
      console.log('2. Check if the extension has a valid auth token');
      return;
    }

    const { report, results } = response.data!;

    // Display the report
    // eslint-disable-next-line no-console
    console.log(report);

    // Create a summary table for console
    // eslint-disable-next-line no-console
    console.log('\n📊 RESULTS SUMMARY:');

    // Group results by status
    const working = results.filter(
      (r: ApiTestResult) => r.status === 'success' && r.message?.includes('affected results')
    );
    const accepted = results.filter(
      (r: ApiTestResult) => r.status === 'success' && !r.message?.includes('affected results')
    );
    const failed = results.filter((r: ApiTestResult) => r.status === 'error');

    // Display working parameters
    if (working.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n✅ CONFIRMED WORKING PARAMETERS:');
      // eslint-disable-next-line no-console
      console.table(
        working.map((r: ApiTestResult) => ({
          Parameter: r.parameter,
          'Test Value': r.value,
          Status: '✓ Working',
        }))
      );
    }

    // Display possibly ignored parameters
    if (accepted.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n⚠️ ACCEPTED BUT POSSIBLY IGNORED:');
      // eslint-disable-next-line no-console
      console.table(
        accepted.map((r: ApiTestResult) => ({
          Parameter: r.parameter,
          'Test Value': r.value,
          Status: '? Accepted',
        }))
      );
    }

    // Display failed parameters
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n❌ FAILED PARAMETERS:');
      // eslint-disable-next-line no-console
      console.table(
        failed.map((r: ApiTestResult) => ({
          Parameter: r.parameter,
          'Test Value': r.value,
          Status: `✗ ${r.responseCode || 'Error'}`,
        }))
      );
    }

    // Generate TypeScript interface suggestion
    // eslint-disable-next-line no-console
    console.log('\n📝 SUGGESTED TypeScript INTERFACE UPDATE:');
    // eslint-disable-next-line no-console
    console.log('Add these to ExpenseFilters in src/features/expenses/types.ts:\n');

    const uniqueWorkingParams = [...new Set(working.map((r: ApiTestResult) => r.parameter))];
    uniqueWorkingParams.forEach((param) => {
      const result = working.find((r: ApiTestResult) => r.parameter === param);
      if (result) {
        const type =
          typeof result.value === 'boolean'
            ? 'boolean'
            : typeof result.value === 'number'
              ? 'number'
              : 'string';
        // eslint-disable-next-line no-console
        console.log(`  ${param}?: ${type};`);
      }
    });

    // eslint-disable-next-line no-console
    console.log('\n✨ Test complete! Results saved to console.');

    // Return results for programmatic use
    return results;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to run test:', error);
    // eslint-disable-next-line no-console
    console.log('\nMake sure:');
    // eslint-disable-next-line no-console
    console.log('1. The extension is properly loaded');
    // eslint-disable-next-line no-console
    console.log('2. You are on the side panel page');
    // eslint-disable-next-line no-console
    console.log('3. You are logged into Navan');
  }
}

// Make function available globally in the side panel
if (typeof window !== 'undefined') {
  (window as Window & { testApiParameters: typeof testApiParameters }).testApiParameters =
    testApiParameters;
  // eslint-disable-next-line no-console
  console.log('💡 API Parameter Tester loaded!');
  // eslint-disable-next-line no-console
  console.log(
    'Run testApiParameters() in this console to test which query parameters work with the Navan API'
  );
}
