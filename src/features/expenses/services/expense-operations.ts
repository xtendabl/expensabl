import {
  ExpenseCreatePayload,
  ExpenseFilters,
  ExpenseListResponse,
  NavanExpenseData,
  ExpenseValidator,
} from '../types';
import { HttpClient } from '../http/http-client';
import { ResponseNormalizer } from '../http/response-normalizer';
import { ValidationError } from '../errors';

// Create simple logger functions
const debug = (_message: string, _data?: unknown) => {
  // Development-only debug logging
};
const info = (_message: string, _data?: unknown) => {
  // Development-only info logging
};
const error = (_message: string, _data?: unknown) => {
  // Development-only error logging
};

export interface ReceiptUploadResult {
  receiptKey: string;
}

export interface ExpenseOperations {
  fetchExpense(expenseId: string): Promise<NavanExpenseData>;
  fetchExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse>;
  createExpense(expenseData: ExpenseCreatePayload): Promise<NavanExpenseData>;
  updateExpense(
    expenseId: string,
    updateData: Partial<ExpenseCreatePayload>
  ): Promise<NavanExpenseData>;
  submitDraftExpense(expenseId: string): Promise<NavanExpenseData>;
  // Receipt operations
  uploadReceipt(expenseId: string, formData: FormData): Promise<ReceiptUploadResult>;
  getReceiptUrl(receiptKey: string): Promise<string>;
  deleteReceipt(expenseId: string, receiptKey: string): Promise<void>;
}

/**
 * Core service for expense operations with the Navan API.
 * Implements the three-step expense creation process and handles
 * various API response formats through normalization.
 *
 * @class ExpenseService
 * @implements {ExpenseOperations}
 *
 * @example
 * ```typescript
 * const httpClient = new ApiHttpClient(config);
 * const service = new ExpenseService(httpClient);
 *
 * // Create expense with automatic retry on failure
 * const expense = await service.createExpense({
 *   merchantAmount: 100.00,
 *   merchantCurrency: 'USD',
 *   date: '2024-01-15',
 *   merchant: { name: 'Restaurant' }
 * });
 * ```
 *
 * @remarks
 * The service tracks operation timing for performance monitoring
 * and provides detailed error context for debugging.
 */
export class ExpenseService implements ExpenseOperations {
  private readonly responseNormalizer: ResponseNormalizer;

  constructor(private httpClient: HttpClient) {
    this.responseNormalizer = new ResponseNormalizer();
  }

  async fetchExpense(expenseId: string): Promise<NavanExpenseData> {
    debug('ExpenseService.fetchExpense: Fetching expense', { expenseId });
    ExpenseValidator.validateExpenseId(expenseId);

    const expense = await this.httpClient.get<NavanExpenseData>(`/expenses/${expenseId}`);

    // Log all receipt-related fields to understand the API response structure
    const receiptFields: Record<string, any> = {};
    for (const key in expense) {
      if (key.toLowerCase().includes('receipt')) {
        receiptFields[key] = (expense as any)[key];
      }
    }

    info('ExpenseService.fetchExpense: Expense fetched successfully', {
      expenseId,
      status: expense.status,
      amount: expense.merchantAmount,
      receiptFields,
      // Also check for any array fields that might contain receipts
      hasReceiptsArray: !!(expense as any).receipts,
      receiptsLength: (expense as any).receipts?.length,
    });

    return expense;
  }

  async fetchExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    debug('ExpenseService.fetchExpenses: Fetching expenses', { filters });

    if (filters) {
      ExpenseValidator.validateExpenseFilters(filters);
    }

    const response = await this.httpClient.getWithParams<unknown>('/search/transactions', filters);
    const normalizedResponse = this.responseNormalizer.normalizeExpenseListResponse(response);

    const responseFormat = this.determineResponseFormat(response);

    info('ExpenseService.fetchExpenses: Expenses fetched', {
      count: normalizedResponse.data.length,
      hasFilters: !!filters,
      format: responseFormat,
    });

    return normalizedResponse;
  }

  // Documenting due to complex three-step process with timing metrics
  /**
   * Creates an expense through Navan's three-step process: Draft → Finalize → Submit.
   * Tracks detailed timing metrics for performance monitoring.
   *
   * @param expenseData - The expense creation payload with merchant and amount details
   * @returns Promise resolving to the created expense with ID and status
   * @throws {ValidationError} If expense data fails validation
   * @throws {ApiError} If any API step fails after retries
   *
   * @remarks
   * The three-step process ensures data consistency:
   * 1. **Draft creation** - Creates expense in draft state, returns ID
   * 2. **Finalization** - Updates expense with complete data
   * 3. **Submission** - Moves expense out of draft state (skipped if isDraft is true)
   *
   * Each step is timed and logged for performance analysis.
   */
  async createExpense(expenseData: ExpenseCreatePayload): Promise<NavanExpenseData> {
    const operationStart = performance.now();
    const operationId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    info('[EXPENSE_SERVICE] createExpense called', {
      operationId,
      amount: expenseData.merchantAmount,
      merchant: expenseData.merchant?.name,
      isDraft: expenseData.isDraft,
      timestamp: Date.now(),
    });

    ExpenseValidator.validateExpenseData(expenseData);

    let expenseId: string | undefined;
    const stepTimings: Record<string, number> = {};

    info('ExpenseService.createExpense: Creating new expense', {
      amount: expenseData.merchantAmount,
      currency: expenseData.merchantCurrency,
      merchant: expenseData.merchant?.name,
      isDraft: expenseData.isDraft,
      operationId,
    });

    try {
      // Step 1: Create expense in draft state
      debug('ExpenseService.createExpense: Creating draft expense');
      const step1Start = performance.now();

      const draftExpense = await this.httpClient.post<NavanExpenseData>(
        '/expenses/manual',
        expenseData
      );

      stepTimings.draft_creation = Math.round(performance.now() - step1Start);

      // Step 2: Extract expense ID and finalize expense
      expenseId = draftExpense.uuid || draftExpense.id;
      if (!expenseId) {
        throw new ValidationError('No expense ID returned from draft creation');
      }

      debug('ExpenseService.createExpense: Finalizing expense', { expenseId });
      const step2Start = performance.now();

      await this.httpClient.patch<NavanExpenseData>(`/expenses/${expenseId}`, expenseData);

      stepTimings.finalization = Math.round(performance.now() - step2Start);

      let finalExpense: NavanExpenseData;

      // Step 3: Submit expense to move it out of draft state (only if not isDraft)
      if (!expenseData.isDraft) {
        debug('ExpenseService.createExpense: Submitting expense', { expenseId });
        const step3Start = performance.now();

        finalExpense = await this.httpClient.post<NavanExpenseData>(
          `/expenses/${expenseId}/submit`,
          {}
        );

        stepTimings.submission = Math.round(performance.now() - step3Start);
      } else {
        // If isDraft is true, fetch the current state of the expense
        debug('ExpenseService.createExpense: Keeping expense in draft state', { expenseId });
        finalExpense = await this.httpClient.get<NavanExpenseData>(`/expenses/${expenseId}`);
        stepTimings.submission = 0; // No submission step for drafts
      }

      const totalTime = Math.round(performance.now() - operationStart);

      info('ExpenseService.createExpense: Expense created successfully', {
        expenseId,
        status: finalExpense.status,
        isDraft: expenseData.isDraft || false,
        operationId: 'create-expense',
        timing: {
          total: totalTime,
          steps: stepTimings,
          breakdown: {
            draft_creation_pct: Math.round((stepTimings.draft_creation / totalTime) * 100),
            finalization_pct: Math.round((stepTimings.finalization / totalTime) * 100),
            submission_pct: stepTimings.submission
              ? Math.round((stepTimings.submission / totalTime) * 100)
              : 0,
          },
        },
        performance: {
          is_slow: totalTime > 10000,
          is_very_slow: totalTime > 20000,
        },
      });

      return finalExpense;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      error('ExpenseService.createExpense: Failed to create expense', {
        error: err,
        expenseId,
        step: expenseId ? 'finalization' : 'draft creation',
        operationId: 'create-expense',
        timing: {
          total: errorTime,
          completed_steps: stepTimings,
        },
      });

      throw err;
    }
  }

  async updateExpense(
    expenseId: string,
    updateData: Partial<ExpenseCreatePayload>
  ): Promise<NavanExpenseData> {
    debug('ExpenseService.updateExpense: Updating expense', {
      expenseId,
      fields: Object.keys(updateData),
    });

    ExpenseValidator.validateExpenseId(expenseId);
    ExpenseValidator.validateExpenseUpdateData(updateData);

    const updatedExpense = await this.httpClient.patch<NavanExpenseData>(
      `/expenses/${expenseId}`,
      updateData
    );

    info('ExpenseService.updateExpense: Expense updated successfully', {
      expenseId,
      status: updatedExpense.status,
    });

    return updatedExpense;
  }

  /**
   * Submits a draft expense to move it out of draft state.
   *
   * @param expenseId - The ID of the draft expense to submit
   * @returns Promise resolving to the submitted expense
   * @throws {ValidationError} If expense ID is invalid
   * @throws {ApiError} If submission fails
   */
  async submitDraftExpense(expenseId: string): Promise<NavanExpenseData> {
    debug('ExpenseService.submitDraftExpense: Submitting draft expense', { expenseId });

    ExpenseValidator.validateExpenseId(expenseId);

    const submittedExpense = await this.httpClient.post<NavanExpenseData>(
      `/expenses/${expenseId}/submit`,
      {}
    );

    info('ExpenseService.submitDraftExpense: Draft expense submitted successfully', {
      expenseId,
      status: submittedExpense.status,
    });

    return submittedExpense;
  }

  // Documenting due to complex response format detection logic
  /**
   * Determines the format of API responses to handle different Navan API versions.
   * Supports multiple response structures for backward compatibility.
   *
   * @param response - The raw API response to analyze
   * @returns Format identifier: 'data_array', 'hal_embedded', 'direct_array', or 'unknown'
   *
   * @remarks
   * Navan API returns expenses in different formats:
   * - **data_array**: `{ data: [...] }` - Current format
   * - **hal_embedded**: `{ _embedded: { transactions: [...] } }` - HAL format
   * - **direct_array**: `[...]` - Legacy direct array
   * - **unknown**: Unrecognized format (logged for investigation)
   */
  private determineResponseFormat(response: unknown): string {
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray((response as Record<string, unknown>).data)
    ) {
      return 'data_array';
    }

    if (
      response &&
      typeof response === 'object' &&
      '_embedded' in response &&
      typeof (response as Record<string, unknown>)._embedded === 'object' &&
      (response as Record<string, unknown>)._embedded !== null &&
      'transactions' in
        ((response as Record<string, unknown>)._embedded as Record<string, unknown>) &&
      Array.isArray(
        ((response as Record<string, unknown>)._embedded as Record<string, unknown>).transactions
      )
    ) {
      return 'hal_embedded';
    }

    if (Array.isArray(response)) {
      return 'direct_array';
    }

    return 'unknown';
  }

  /**
   * Upload a receipt for an expense
   */
  async uploadReceipt(expenseId: string, formData: FormData): Promise<ReceiptUploadResult> {
    const response = await this.httpClient.post<any>(`/expenses/${expenseId}/receipt`, formData);

    return this.extractReceiptData(response);
  }

  /**
   * Extract receipt data from response
   */
  private extractReceiptData(response: any): ReceiptUploadResult {
    const receiptKey = response?.data?.receiptKey || response?.receiptKey;

    if (!receiptKey) {
      throw new Error('No receipt key found in response');
    }

    return {
      receiptKey,
    };
  }

  /**
   * Get receipt URL for viewing
   * Fetches the presigned S3 URL from the Navan API
   */
  async getReceiptUrl(receiptKey: string): Promise<string> {
    // The HTTP client adds /user prefix, so we only need /download path
    // This will result in the correct URL: /api/liquid/user/download
    const encodedKey = encodeURIComponent(receiptKey);

    const path = '/download';
    const params = { fileKey: receiptKey, inline: true };

    try {
      // Call the API to get the presigned URL
      // The API returns a JSON object with the presigned S3 URL
      const response = await this.httpClient.getWithParams<{ url: string }>(path, params);

      if (!response || !response.url) {
        console.error('[RECEIPT_SERVICE] Invalid response - missing URL:', response);
        throw new Error('No URL in response');
      }

      info('Receipt presigned URL fetched:', { receiptKey, url: response.url });

      // Return the presigned S3 URL
      return response.url;
    } catch (err) {
      console.error('[RECEIPT_SERVICE] Failed to get presigned URL:', {
        receiptKey,
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined,
      });

      error('Failed to get presigned URL:', { receiptKey, error: err });

      // Fallback to the direct download URL
      const fallbackUrl = `https://app.navan.com/api/liquid/user/download?fileKey=${encodedKey}&inline=true`;
      return fallbackUrl;
    }
  }

  /**
   * Delete a receipt from an expense
   */
  async deleteReceipt(expenseId: string, receiptKey: string): Promise<void> {
    await this.httpClient.delete(`/expenses/${expenseId}/receipt`);
  }
}
