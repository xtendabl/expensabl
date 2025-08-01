import { ExpenseData } from '../../../../features/expenses/types';
import { Category } from '../../../../features/expenses/manager-extended';

/**
 * Creates a minimal mock expense for testing
 * Uses type assertion to bypass strict type checking while maintaining
 * the essential fields needed for testing
 */
export function createMockExpense(overrides: Partial<ExpenseData> = {}): ExpenseData {
  const now = new Date().toISOString();

  return {
    // Essential fields that are commonly used in tests
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    status: 'pending',
    accountAmount: 100,
    accountCurrency: 'USD',
    merchantAmount: 100,
    merchantCurrency: 'USD',
    dateCreated: now,
    authorizationDate: now,
    instant: now,
    prettyMerchantName: 'Test Merchant',
    policyName: 'Standard Policy',
    merchant: {
      name: 'Test Merchant',
    },

    // Apply overrides
    ...overrides,
  } as ExpenseData;
}

/**
 * Creates a mock category
 */
export function createMockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-123',
    name: 'Test Category',
    description: 'Test category description',
    ...overrides,
  };
}
