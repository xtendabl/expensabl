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
import { chromeLogger } from '../../../shared/services/logger/chrome-logger-setup';
import { sanitizePayloadQuick } from '../../../shared/utils/payload-sanitizer';

// Create logger functions using chromeLogger
const debug = chromeLogger.debug.bind(chromeLogger);
const info = chromeLogger.info.bind(chromeLogger);
const error = chromeLogger.error.bind(chromeLogger);

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
    const operationStart = performance.now();
    const operationId = `fetch_exp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation
    info('EXPENSE_OPERATION: fetchExpense initiated', {
      operation: 'fetchExpense',
      operationId,
      requestPayload: sanitizePayloadQuick({ expenseId }),
      timestamp: Date.now(),
    });

    debug('ExpenseService.fetchExpense: Fetching expense', { expenseId, operationId });
    ExpenseValidator.validateExpenseId(expenseId);

    try {
      const expense = await this.httpClient.get<NavanExpenseData>(`/expenses/${expenseId}`);

      // Log all receipt-related fields to understand the API response structure
      const receiptFields: Record<string, any> = {};
      for (const key in expense) {
        if (key.toLowerCase().includes('receipt')) {
          receiptFields[key] = (expense as any)[key];
        }
      }

      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion with response analysis
      info('EXPENSE_OPERATION: fetchExpense completed', {
        operation: 'fetchExpense',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(expense),
        sampleResponse: sanitizePayloadQuick(expense, { maxStringLength: 1000 }),
        timing: { total: operationTime },
        metadata: {
          expenseId,
          status: expense.status,
          amount: expense.merchantAmount,
          receiptFields,
          hasReceiptsArray: !!(expense as any).receipts,
          receiptsLength: (expense as any).receipts?.length,
        },
      });

      return expense;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: fetchExpense failed', {
        operation: 'fetchExpense',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: { expenseId },
      });

      throw err;
    }
  }

  async fetchExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    const operationStart = performance.now();
    const operationId = `fetch_exps_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation
    info('EXPENSE_OPERATION: fetchExpenses initiated', {
      operation: 'fetchExpenses',
      operationId,
      requestPayload: sanitizePayloadQuick({ filters }),
      hasFilters: !!filters,
      timestamp: Date.now(),
    });

    debug('ExpenseService.fetchExpenses: Fetching expenses', { filters, operationId });

    if (filters) {
      ExpenseValidator.validateExpenseFilters(filters);
    }

    try {
      const response = await this.httpClient.getWithParams<unknown>(
        '/search/transactions',
        filters
      );
      const normalizedResponse = this.responseNormalizer.normalizeExpenseListResponse(response);

      const responseFormat = this.determineResponseFormat(response);
      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion with response analysis
      info('EXPENSE_OPERATION: fetchExpenses completed', {
        operation: 'fetchExpenses',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(normalizedResponse),
        sampleResponse: sanitizePayloadQuick(normalizedResponse, { maxStringLength: 2000 }),
        timing: { total: operationTime },
        metadata: {
          count: normalizedResponse.data.length,
          hasFilters: !!filters,
          format: responseFormat,
          firstItemStructure:
            normalizedResponse.data.length > 0
              ? this.responseNormalizer.analyzeResponseStructure(normalizedResponse.data[0])
              : null,
        },
      });

      return normalizedResponse;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: fetchExpenses failed', {
        operation: 'fetchExpenses',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: { filters, hasFilters: !!filters },
      });

      throw err;
    }
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
    const operationId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

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
      const step1CorrelationId = `${operationId}_step1_${Date.now()}`;

      info('CREATE_EXPENSE: Step 1 - Draft creation initiated', {
        operationId,
        step: 'draft_creation',
        stepCorrelationId: step1CorrelationId,
        requestPayload: sanitizePayloadQuick(expenseData, { maxStringLength: 1500 }),
        endpoint: '/expenses/manual',
        method: 'POST',
        timestamp: Date.now(),
      });

      debug('ExpenseService.createExpense: Creating draft expense');
      const step1Start = performance.now();

      const draftExpense = await this.httpClient.post<NavanExpenseData>(
        '/expenses/manual',
        expenseData
      );

      stepTimings.draft_creation = Math.round(performance.now() - step1Start);

      // Log Step 1 completion with detailed response analysis
      info('CREATE_EXPENSE: Step 1 - Draft creation completed', {
        operationId,
        step: 'draft_creation',
        stepCorrelationId: step1CorrelationId,
        success: true,
        timing: { stepTime: stepTimings.draft_creation },
        rawResponse: sanitizePayloadQuick(draftExpense, { maxStringLength: 2000 }),
        responseStructure: this.responseNormalizer.analyzeResponseStructure(draftExpense),
        extractedData: {
          expenseId: draftExpense.uuid || draftExpense.id,
          status: draftExpense.status,
          amount: draftExpense.merchantAmount,
          hasUuid: !!draftExpense.uuid,
          hasId: !!draftExpense.id,
        },
      });

      // Step 2: Extract expense ID and finalize expense
      expenseId = draftExpense.uuid || draftExpense.id;
      if (!expenseId) {
        error('CREATE_EXPENSE: Step 1 - No expense ID in response', {
          operationId,
          step: 'draft_creation',
          stepCorrelationId: step1CorrelationId,
          draftResponse: sanitizePayloadQuick(draftExpense),
          availableFields: Object.keys(draftExpense),
        });
        throw new ValidationError('No expense ID returned from draft creation');
      }

      const step2CorrelationId = `${operationId}_step2_${Date.now()}`;

      info('CREATE_EXPENSE: Step 2 - Finalization initiated', {
        operationId,
        step: 'finalization',
        stepCorrelationId: step2CorrelationId,
        expenseId,
        requestPayload: sanitizePayloadQuick(expenseData, { maxStringLength: 1500 }),
        endpoint: `/expenses/${expenseId}`,
        method: 'PATCH',
        timestamp: Date.now(),
      });

      debug('ExpenseService.createExpense: Finalizing expense', { expenseId });
      const step2Start = performance.now();

      const finalizeResponse = await this.httpClient.patch<NavanExpenseData>(
        `/expenses/${expenseId}`,
        expenseData
      );

      stepTimings.finalization = Math.round(performance.now() - step2Start);

      // Log Step 2 completion
      info('CREATE_EXPENSE: Step 2 - Finalization completed', {
        operationId,
        step: 'finalization',
        stepCorrelationId: step2CorrelationId,
        expenseId,
        success: true,
        timing: { stepTime: stepTimings.finalization },
        rawResponse: sanitizePayloadQuick(finalizeResponse, { maxStringLength: 2000 }),
        responseStructure: this.responseNormalizer.analyzeResponseStructure(finalizeResponse),
        statusAfterFinalization: finalizeResponse.status,
      });

      let finalExpense: NavanExpenseData;

      // Step 3: Submit expense to move it out of draft state (only if not isDraft)
      if (!expenseData.isDraft) {
        const step3CorrelationId = `${operationId}_step3_${Date.now()}`;

        info('CREATE_EXPENSE: Step 3 - Submission initiated', {
          operationId,
          step: 'submission',
          stepCorrelationId: step3CorrelationId,
          expenseId,
          requestPayload: {},
          endpoint: `/expenses/${expenseId}/submit`,
          method: 'POST',
          workflowPath: 'draft -> submitted',
          timestamp: Date.now(),
        });

        debug('ExpenseService.createExpense: Submitting expense', { expenseId });
        const step3Start = performance.now();

        finalExpense = await this.httpClient.post<NavanExpenseData>(
          `/expenses/${expenseId}/submit`,
          {}
        );

        stepTimings.submission = Math.round(performance.now() - step3Start);

        // Log Step 3 completion
        info('CREATE_EXPENSE: Step 3 - Submission completed', {
          operationId,
          step: 'submission',
          stepCorrelationId: step3CorrelationId,
          expenseId,
          success: true,
          timing: { stepTime: stepTimings.submission },
          rawResponse: sanitizePayloadQuick(finalExpense, { maxStringLength: 2000 }),
          responseStructure: this.responseNormalizer.analyzeResponseStructure(finalExpense),
          statusTransition: `${finalizeResponse.status} -> ${finalExpense.status}`,
          workflowPath: 'draft -> submitted',
        });
      } else {
        // If isDraft is true, fetch the current state of the expense
        const step3CorrelationId = `${operationId}_step3_draft_${Date.now()}`;

        info('CREATE_EXPENSE: Step 3 - Draft state preservation', {
          operationId,
          step: 'draft_preservation',
          stepCorrelationId: step3CorrelationId,
          expenseId,
          endpoint: `/expenses/${expenseId}`,
          method: 'GET',
          workflowPath: 'draft -> draft (preserved)',
          timestamp: Date.now(),
        });

        debug('ExpenseService.createExpense: Keeping expense in draft state', { expenseId });
        const step3Start = performance.now();

        finalExpense = await this.httpClient.get<NavanExpenseData>(`/expenses/${expenseId}`);
        stepTimings.submission = Math.round(performance.now() - step3Start);

        // Log Step 3 completion for draft preservation
        info('CREATE_EXPENSE: Step 3 - Draft state preserved', {
          operationId,
          step: 'draft_preservation',
          stepCorrelationId: step3CorrelationId,
          expenseId,
          success: true,
          timing: { stepTime: stepTimings.submission },
          rawResponse: sanitizePayloadQuick(finalExpense, { maxStringLength: 2000 }),
          responseStructure: this.responseNormalizer.analyzeResponseStructure(finalExpense),
          finalStatus: finalExpense.status,
          workflowPath: 'draft -> draft (preserved)',
        });
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

      // Determine which step failed based on completed timings and expense ID
      let failedStep = 'draft_creation';
      let stepContext: Record<string, unknown> = {};

      if (stepTimings.draft_creation && !expenseId) {
        failedStep = 'id_extraction';
        stepContext = {
          draftCreationCompleted: true,
          draftCreationTime: stepTimings.draft_creation,
          idExtractionFailed: true,
        };
      } else if (stepTimings.draft_creation && expenseId && !stepTimings.finalization) {
        failedStep = 'finalization';
        stepContext = {
          draftCreationCompleted: true,
          expenseId,
          finalizationFailed: true,
        };
      } else if (stepTimings.finalization && !stepTimings.submission && !expenseData.isDraft) {
        failedStep = 'submission';
        stepContext = {
          draftCreationCompleted: true,
          finalizationCompleted: true,
          expenseId,
          submissionFailed: true,
          workflowPath: 'draft -> submitted (failed)',
        };
      } else if (stepTimings.finalization && !stepTimings.submission && expenseData.isDraft) {
        failedStep = 'draft_preservation';
        stepContext = {
          draftCreationCompleted: true,
          finalizationCompleted: true,
          expenseId,
          draftPreservationFailed: true,
          workflowPath: 'draft -> draft (failed)',
        };
      }

      // Log comprehensive step failure information
      error('CREATE_EXPENSE: Multi-step process failed', {
        operationId,
        failedStep,
        stepContext,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: {
          total: errorTime,
          completed_steps: stepTimings,
          step_completion: {
            draft_creation: !!stepTimings.draft_creation,
            finalization: !!stepTimings.finalization,
            submission: !!stepTimings.submission,
          },
        },
        requestContext: {
          originalPayload: sanitizePayloadQuick(expenseData),
          isDraft: expenseData.isDraft,
          workflowPath: expenseData.isDraft ? 'draft -> draft' : 'draft -> submitted',
          expenseId: expenseId || null,
        },
        debugInfo: {
          hasExpenseId: !!expenseId,
          completedSteps: Object.keys(stepTimings),
          stepCount: Object.keys(stepTimings).length,
        },
      });

      // Also log the original error for backward compatibility
      error('ExpenseService.createExpense: Failed to create expense', {
        error: err,
        expenseId,
        step: failedStep,
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
    const operationStart = performance.now();
    const operationId = `update_exp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation
    info('EXPENSE_OPERATION: updateExpense initiated', {
      operation: 'updateExpense',
      operationId,
      requestPayload: sanitizePayloadQuick({ expenseId, updateData }),
      metadata: {
        expenseId,
        fields: Object.keys(updateData),
        fieldCount: Object.keys(updateData).length,
      },
      timestamp: Date.now(),
    });

    debug('ExpenseService.updateExpense: Updating expense', {
      expenseId,
      fields: Object.keys(updateData),
      operationId,
    });

    ExpenseValidator.validateExpenseId(expenseId);
    ExpenseValidator.validateExpenseUpdateData(updateData);

    try {
      const updatedExpense = await this.httpClient.patch<NavanExpenseData>(
        `/expenses/${expenseId}`,
        updateData
      );

      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion with response analysis
      info('EXPENSE_OPERATION: updateExpense completed', {
        operation: 'updateExpense',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(updatedExpense),
        sampleResponse: sanitizePayloadQuick(updatedExpense, { maxStringLength: 1000 }),
        timing: { total: operationTime },
        metadata: {
          expenseId,
          status: updatedExpense.status,
          fieldsUpdated: Object.keys(updateData),
          fieldCount: Object.keys(updateData).length,
        },
      });

      return updatedExpense;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: updateExpense failed', {
        operation: 'updateExpense',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: {
          expenseId,
          updateData: sanitizePayloadQuick(updateData),
          fields: Object.keys(updateData),
        },
      });

      throw err;
    }
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
    const operationStart = performance.now();
    const operationId = `submit_draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation
    info('EXPENSE_OPERATION: submitDraftExpense initiated', {
      operation: 'submitDraftExpense',
      operationId,
      requestPayload: sanitizePayloadQuick({ expenseId }),
      timestamp: Date.now(),
    });

    debug('ExpenseService.submitDraftExpense: Submitting draft expense', {
      expenseId,
      operationId,
    });

    ExpenseValidator.validateExpenseId(expenseId);

    try {
      const submittedExpense = await this.httpClient.post<NavanExpenseData>(
        `/expenses/${expenseId}/submit`,
        {}
      );

      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion with response analysis
      info('EXPENSE_OPERATION: submitDraftExpense completed', {
        operation: 'submitDraftExpense',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(submittedExpense),
        sampleResponse: sanitizePayloadQuick(submittedExpense, { maxStringLength: 1000 }),
        timing: { total: operationTime },
        metadata: {
          expenseId,
          status: submittedExpense.status,
          statusTransition: 'draft -> submitted',
        },
      });

      return submittedExpense;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: submitDraftExpense failed', {
        operation: 'submitDraftExpense',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: { expenseId },
      });

      throw err;
    }
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
    const operationStart = performance.now();
    const operationId = `upload_receipt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation with FormData analysis
    const formDataInfo: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        formDataInfo[key] = {
          type: 'File',
          name: value.name,
          size: value.size,
          mimeType: value.type,
        };
      } else {
        formDataInfo[key] = sanitizePayloadQuick(value);
      }
    }

    info('EXPENSE_OPERATION: uploadReceipt initiated', {
      operation: 'uploadReceipt',
      operationId,
      requestPayload: sanitizePayloadQuick({ expenseId, formDataFields: formDataInfo }),
      metadata: {
        expenseId,
        fieldCount: Array.from(formData.keys()).length,
        hasFile: Array.from(formData.values()).some((v) => v instanceof File),
      },
      timestamp: Date.now(),
    });

    try {
      const response = await this.httpClient.post<any>(`/expenses/${expenseId}/receipt`, formData);
      const result = this.extractReceiptData(response);

      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion
      info('EXPENSE_OPERATION: uploadReceipt completed', {
        operation: 'uploadReceipt',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(response),
        sampleResponse: sanitizePayloadQuick(response, { maxStringLength: 1000 }),
        timing: { total: operationTime },
        metadata: {
          expenseId,
          receiptKey: result.receiptKey,
          uploadSuccess: true,
        },
      });

      return result;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: uploadReceipt failed', {
        operation: 'uploadReceipt',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: {
          expenseId,
          formDataFields: formDataInfo,
        },
      });

      throw err;
    }
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
    const operationStart = performance.now();
    const operationId = `get_receipt_url_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Log operation initiation
    info('EXPENSE_OPERATION: getReceiptUrl initiated', {
      operation: 'getReceiptUrl',
      operationId,
      requestPayload: sanitizePayloadQuick({ receiptKey }),
      timestamp: Date.now(),
    });

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
        throw new Error('No URL in response');
      }

      const operationTime = Math.round(performance.now() - operationStart);

      // Log operation completion
      info('EXPENSE_OPERATION: getReceiptUrl completed', {
        operation: 'getReceiptUrl',
        operationId,
        success: true,
        responseStructure: this.responseNormalizer.analyzeResponseStructure(response),
        sampleResponse: sanitizePayloadQuick(response, { maxStringLength: 500 }),
        timing: { total: operationTime },
        metadata: {
          receiptKey,
          hasUrl: !!response.url,
          urlLength: response.url?.length || 0,
        },
      });

      // Return the presigned S3 URL
      return response.url;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      // Log operation failure with context
      error('EXPENSE_OPERATION: getReceiptUrl failed', {
        operation: 'getReceiptUrl',
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        requestContext: { receiptKey, encodedKey },
      });

      // Fallback to the direct download URL
      const fallbackUrl = `https://app.navan.com/api/liquid/user/download?fileKey=${encodedKey}&inline=true`;

      info('EXPENSE_OPERATION: getReceiptUrl using fallback URL', {
        operation: 'getReceiptUrl',
        operationId,
        fallbackUrl,
        receiptKey,
      });

      return fallbackUrl;
    }
  }

  /**
   * Delete a receipt from an expense
   */
  async deleteReceipt(expenseId: string, receiptKey: string): Promise<void> {
    debug('ExpenseService.deleteReceipt: Deleting receipt', { expenseId, receiptKey });
    await this.httpClient.delete(`/expenses/${expenseId}/receipt`);
    info('ExpenseService.deleteReceipt: Receipt deleted successfully', { expenseId, receiptKey });
  }
}
