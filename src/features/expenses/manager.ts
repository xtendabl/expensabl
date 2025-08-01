import { ApiConfig, DEFAULT_API_CONFIG } from './config/api-config';
import { ApiHttpClient } from './http/http-client';
import { ExpenseService } from './services/expense-operations';
import {
  ExpenseCreatePayload,
  ExpenseFilters,
  ExpenseListResponse,
  NavanExpenseData,
} from './types';

/**
 * Manages expense operations including creation, fetching, and updating.
 * Delegates to the ExpenseService for business logic and uses ApiHttpClient for HTTP operations.
 *
 * @example
 * ```typescript
 * const manager = new ExpenseManager('America/New_York');
 *
 * // Fetch an expense
 * const expense = await manager.fetchExpense('expense-123');
 *
 * // Create a new expense
 * const newExpense = await manager.createExpense({
 *   merchantAmount: 25.99,
 *   merchantCurrency: 'USD',
 *   date: '2024-01-15',
 *   merchant: { name: 'Coffee Shop' },
 *   policy: { id: 'policy-1' },
 *   details: { category: 'meals' },
 *   reportingData: { department: 'engineering' }
 * });
 * ```
 */
class ExpenseManager {
  private readonly expenseService: ExpenseService;

  /**
   * Creates a new ExpenseManager instance.
   *
   * @param timezone - The default timezone for expense operations (defaults to 'America/Los_Angeles')
   */
  constructor(timezone?: string) {
    const config: ApiConfig = {
      ...DEFAULT_API_CONFIG,
      ...(timezone && { defaultTimezone: timezone }),
    };

    const httpClient = new ApiHttpClient(config);
    this.expenseService = new ExpenseService(httpClient);
  }

  /**
   * Fetches a single expense by its ID.
   *
   * @param expenseId - The unique identifier of the expense to fetch
   * @returns Promise that resolves to the expense data
   * @throws {ValidationError} When expenseId is invalid or empty
   * @throws {AuthenticationError} When authentication token is missing or invalid
   * @throws {ApiError} When the API request fails or expense is not found
   * @throws {TimeoutError} When the request times out
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const expense = await expenseManager.fetchExpense('exp_123456');
   * console.log(`Expense amount: ${expense.merchantAmount} ${expense.merchantCurrency}`);
   * ```
   */
  public async fetchExpense(expenseId: string): Promise<NavanExpenseData> {
    return this.expenseService.fetchExpense(expenseId);
  }

  /**
   * Fetches multiple expenses with optional filtering.
   * Normalizes different API response formats to ensure consistent return structure.
   *
   * @param filters - Optional filters to apply to the expense search
   * @returns Promise that resolves to a list of expenses with metadata
   * @throws {ValidationError} When filter parameters are invalid
   * @throws {AuthenticationError} When authentication token is missing or invalid
   * @throws {ApiError} When the API request fails
   * @throws {TimeoutError} When the request times out
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * // Fetch all expenses
   * const allExpenses = await expenseManager.fetchExpenses();
   *
   * // Fetch expenses with filters
   * const filteredExpenses = await expenseManager.fetchExpenses({
   *   dateFrom: '2024-01-01',
   *   dateTo: '2024-01-31',
   *   status: 'APPROVED',
   *   minAmount: 50.00
   * });
   * ```
   */
  public async fetchExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    return this.expenseService.fetchExpenses(filters);
  }

  /**
   * Creates a new expense through a three-step process:
   * 1. Creates expense in draft state
   * 2. Finalizes expense with provided data
   * 3. Submits expense to move it out of draft state
   *
   * @param expenseData - The expense data including amount, currency, date, merchant, etc.
   * @returns Promise that resolves to the created and submitted expense
   * @throws {ValidationError} When required fields are missing or invalid
   * @throws {AuthenticationError} When authentication token is missing or invalid
   * @throws {ApiError} When any step of the creation process fails
   * @throws {TimeoutError} When requests time out
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * const newExpense = await expenseManager.createExpense({
   *   merchantAmount: 45.50,
   *   merchantCurrency: 'USD',
   *   date: '2024-01-15',
   *   merchant: { name: 'Restaurant ABC' },
   *   policy: { id: 'policy-meals' },
   *   details: {
   *     category: 'meals_entertainment',
   *     description: 'Team lunch meeting'
   *   },
   *   reportingData: {
   *     department: 'engineering',
   *     project: 'project-alpha'
   *   }
   * });
   * ```
   */
  public async createExpense(expenseData: ExpenseCreatePayload): Promise<NavanExpenseData> {
    return this.expenseService.createExpense(expenseData);
  }

  /**
   * Updates an existing expense with new data.
   * Only the provided fields will be updated; omitted fields remain unchanged.
   *
   * @param expenseId - The unique identifier of the expense to update
   * @param updateData - Partial expense data containing only the fields to update
   * @returns Promise that resolves to the updated expense data
   * @throws {ValidationError} When expenseId is invalid or updateData contains invalid values
   * @throws {AuthenticationError} When authentication token is missing or invalid
   * @throws {ApiError} When the API request fails or expense is not found
   * @throws {TimeoutError} When the request times out
   * @throws {NetworkError} When network connectivity issues occur
   *
   * @example
   * ```typescript
   * // Update only the amount and description
   * const updatedExpense = await expenseManager.updateExpense('exp_123456', {
   *   merchantAmount: 52.75,
   *   details: {
   *     description: 'Updated: Team lunch with client'
   *   }
   * });
   * ```
   */
  public async updateExpense(
    expenseId: string,
    updateData: Partial<ExpenseCreatePayload>
  ): Promise<NavanExpenseData> {
    return this.expenseService.updateExpense(expenseId, updateData);
  }
}

/**
 * Pre-configured instance of ExpenseManager
 *
 * @example
 * ```typescript
 * import { expenseManager } from './expense/manager';
 *
 * // Fetch a single expense
 * const expense = await expenseManager.fetchExpense('expense-id');
 *
 * // Create a new expense
 * const newExpense = await expenseManager.createExpense({
 *   merchantAmount: 100.50,
 *   merchantCurrency: 'USD',
 *   date: '2024-01-01',
 *   merchant: { name: 'Coffee Shop' },
 *   // ... other fields
 * });
 * ```
 */
export const expenseManager = new ExpenseManager();

// Also export the class for testing or custom configuration
export { ExpenseManager };
