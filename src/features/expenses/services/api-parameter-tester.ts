import { ApiHttpClient } from '../http/http-client';
import { RequestBuilder } from '../http/request-builder';
import { ApiConfig } from '../config/api-config';
import { info, error } from '../../../shared/services/logger/chrome-logger-setup';

interface ParameterTestResult {
  parameter: string;
  value: string | number | boolean;
  status: 'success' | 'error' | 'ignored';
  responseCode?: number;
  message?: string;
  sampleData?: any;
}

/**
 * Test harness for discovering supported query parameters in the Navan API
 */
export class ApiParameterTester {
  private httpClient: ApiHttpClient;
  private results: ParameterTestResult[] = [];

  constructor(httpClient: ApiHttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Test a single parameter against the API
   */
  private async testParameter(
    param: string,
    value: string | number | boolean
  ): Promise<ParameterTestResult> {
    try {
      info(`Testing parameter: ${param} = ${value}`);

      const params = {
        q: 'Delta', // Base query to ensure we get some results
        [param]: value,
      };

      const response = await this.httpClient.getWithParams('/search/transactions', params);

      // Check if the parameter affected the response
      const baseResponse = await this.httpClient.getWithParams('/search/transactions', {
        q: 'Delta',
      });

      // Simple heuristic: if responses differ, parameter likely worked
      const responseChanged = JSON.stringify(response) !== JSON.stringify(baseResponse);

      return {
        parameter: param,
        value,
        status: 'success',
        responseCode: 200,
        message: responseChanged
          ? 'Parameter accepted and affected results'
          : 'Parameter accepted but may be ignored',
        sampleData: Array.isArray(response) ? response.slice(0, 1) : response,
      };
    } catch (err: any) {
      error(`Failed testing parameter ${param}:`, err);
      return {
        parameter: param,
        value,
        status: 'error',
        responseCode: err.status,
        message: err.message || 'Request failed',
      };
    }
  }

  /**
   * Run comprehensive parameter tests
   */
  async runTests(): Promise<ParameterTestResult[]> {
    info('Starting API parameter discovery tests...');

    // Pagination parameters
    const paginationTests = [
      { param: 'limit', value: 5 },
      { param: 'size', value: 5 },
      { param: 'pageSize', value: 5 },
      { param: 'max', value: 5 },
      { param: 'count', value: 5 },
      { param: 'offset', value: 0 },
      { param: 'skip', value: 0 },
      { param: 'page', value: 1 },
      { param: 'pageNumber', value: 1 },
      { param: 'cursor', value: '' },
      { param: 'after', value: '' },
      { param: 'before', value: '' },
    ];

    // Sorting parameters
    const sortingTests = [
      { param: 'sort', value: 'date' },
      { param: 'sort', value: '-date' },
      { param: 'sort', value: 'amount' },
      { param: 'sort', value: 'merchantName' },
      { param: 'sortBy', value: 'date' },
      { param: 'orderBy', value: 'date' },
      { param: 'order', value: 'asc' },
      { param: 'order', value: 'desc' },
      { param: 'direction', value: 'asc' },
      { param: 'sortOrder', value: 'desc' },
    ];

    // Date filtering parameters
    const dateTests = [
      { param: 'from', value: '2024-01-01' },
      { param: 'to', value: '2024-12-31' },
      { param: 'startDate', value: '2024-01-01' },
      { param: 'endDate', value: '2024-12-31' },
      { param: 'dateFrom', value: '2024-01-01' },
      { param: 'dateTo', value: '2024-12-31' },
      { param: 'since', value: '2024-01-01' },
      { param: 'until', value: '2024-12-31' },
      { param: 'after', value: '2024-01-01T00:00:00Z' },
      { param: 'before', value: '2024-12-31T23:59:59Z' },
    ];

    // Status and category filters
    const statusTests = [
      { param: 'status', value: 'pending' },
      { param: 'status', value: 'approved' },
      { param: 'status', value: 'submitted' },
      { param: 'status', value: 'draft' },
      { param: 'state', value: 'pending' },
      { param: 'category', value: 'travel' },
      { param: 'category', value: 'meals' },
      { param: 'type', value: 'expense' },
      { param: 'expenseType', value: 'personal' },
      { param: 'transactionType', value: 'card' },
    ];

    // Financial filters
    const financialTests = [
      { param: 'minAmount', value: 10 },
      { param: 'maxAmount', value: 1000 },
      { param: 'amount', value: 100 },
      { param: 'amountMin', value: 10 },
      { param: 'amountMax', value: 1000 },
      { param: 'currency', value: 'USD' },
      { param: 'currencyCode', value: 'USD' },
      { param: 'paymentMethod', value: 'card' },
      { param: 'paymentType', value: 'credit' },
      { param: 'cardType', value: 'corporate' },
    ];

    // Receipt and reimbursement filters
    const receiptTests = [
      { param: 'hasReceipt', value: true },
      { param: 'hasReceipt', value: false },
      { param: 'withReceipt', value: true },
      { param: 'receiptRequired', value: true },
      { param: 'reimbursable', value: true },
      { param: 'reimbursable', value: false },
      { param: 'isReimbursable', value: true },
      { param: 'needsReceipt', value: true },
    ];

    // Additional filters
    const additionalTests = [
      { param: 'merchant', value: 'Delta' },
      { param: 'merchantName', value: 'Delta' },
      { param: 'vendor', value: 'Delta' },
      { param: 'tags', value: 'business' },
      { param: 'tag', value: 'client' },
      { param: 'labels', value: 'important' },
      { param: 'project', value: 'Q1-2024' },
      { param: 'projectId', value: '123' },
      { param: 'userId', value: 'current' },
      { param: 'user', value: 'me' },
      { param: 'assignee', value: 'self' },
      { param: 'include', value: 'receipts' },
      { param: 'expand', value: 'merchant' },
      { param: 'fields', value: 'id,amount,merchant' },
    ];

    // Combine all test cases
    const allTests = [
      ...paginationTests,
      ...sortingTests,
      ...dateTests,
      ...statusTests,
      ...financialTests,
      ...receiptTests,
      ...additionalTests,
    ];

    // Run tests in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < allTests.length; i += batchSize) {
      const batch = allTests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((test) => this.testParameter(test.param, test.value))
      );
      this.results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < allTests.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return this.results;
  }

  /**
   * Generate a summary report of test results
   */
  generateReport(): string {
    const successful = this.results.filter((r) => r.status === 'success');
    const failed = this.results.filter((r) => r.status === 'error');
    const likely = successful.filter((r) => r.message?.includes('affected results'));

    let report = '=== Navan API Parameter Test Report ===\n\n';

    report += `Total Parameters Tested: ${this.results.length}\n`;
    report += `Successful Requests: ${successful.length}\n`;
    report += `Failed Requests: ${failed.length}\n`;
    report += `Likely Working Parameters: ${likely.length}\n\n`;

    report += '=== Confirmed Working Parameters ===\n';
    likely.forEach((r) => {
      report += `✓ ${r.parameter} = ${r.value} - ${r.message}\n`;
    });

    report += '\n=== Possibly Ignored Parameters ===\n';
    successful
      .filter((r) => !r.message?.includes('affected results'))
      .forEach((r) => {
        report += `? ${r.parameter} = ${r.value} - ${r.message}\n`;
      });

    report += '\n=== Failed Parameters ===\n';
    failed.forEach((r) => {
      report += `✗ ${r.parameter} = ${r.value} - ${r.message} (${r.responseCode})\n`;
    });

    return report;
  }

  /**
   * Get results as JSON for further analysis
   */
  getResultsJson(): ParameterTestResult[] {
    return this.results;
  }
}
