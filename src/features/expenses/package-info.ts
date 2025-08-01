/**
 * Expense Management Domain
 * @packageDocumentation
 * @module features/expenses
 *
 * Handles all expense-related operations with the Navan API.
 *
 * ## Architecture
 *
 * ### Core Components
 * - **manager.ts** - Public API facade for expense operations
 * - **services/expense-operations.ts** - Business logic implementation
 * - **http/** - HTTP client with retry and error handling
 * - **types/** - TypeScript interfaces and validators
 *
 * ### HTTP Layer
 * - **http-client.ts** - Configurable HTTP client with interceptors
 * - **retry-policy.ts** - Exponential backoff retry logic
 * - **request-builder.ts** - Request construction and headers
 * - **response-normalizer.ts** - Handles multiple API response formats
 *
 * ### Key Features
 * - **Three-step expense creation**: Draft → Finalize → Submit
 * - **Automatic retry** for transient failures (5xx, network errors)
 * - **Response normalization** for different API versions
 * - **Comprehensive error types** for different failure scenarios
 *
 * ## Usage Example
 * ```typescript
 * const manager = new ExpenseManager('America/New_York');
 * const expense = await manager.createExpense({
 *   merchantAmount: 50.00,
 *   merchantCurrency: 'USD',
 *   date: '2024-01-15',
 *   merchant: { name: 'Coffee Shop' }
 * });
 * ```
 */
export {};
