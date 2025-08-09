import { ExpenseManager } from './manager';
import { ExpenseCreatePayload, ExpenseFilters, NavanExpenseData } from './types';
import { ValidationResult } from '../templates/types';
import { ReceiptUploadResult } from './services/expense-operations';

/**
 * Category information for expense classification
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

/**
 * Expense statistics data
 */
export interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  byCategory: Record<
    string,
    {
      amount: number;
      count: number;
    }
  >;
  byStatus: Record<
    string,
    {
      amount: number;
      count: number;
    }
  >;
  byDate?: Record<
    string,
    {
      amount: number;
      count: number;
    }
  >;
}

/**
 * Search parameters for expense queries
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  filters?: ExpenseFilters;
}

/**
 * Extended ExpenseManager with additional functionality for search, categories, and statistics
 */
export class ExtendedExpenseManager extends ExpenseManager {
  /**
   * Get the underlying expense service for direct access to receipt operations
   */
  getExpenseService() {
    if (!this.expenseService) {
      throw new Error('Expense service not initialized. Please use authAwareExpenseManager.');
    }
    return this.expenseService;
  }

  /**
   * Searches expenses based on a text query and optional filters
   *
   * @param params - Search parameters including query string and filters
   * @returns Promise resolving to array of matching expenses
   */
  async searchExpenses(params: SearchParams): Promise<NavanExpenseData[]> {
    // For now, use the regular fetch with filters and do client-side filtering
    // In a real implementation, this would call a dedicated search endpoint
    const response = await this.fetchExpenses(params.filters);
    const expenses = response.data;

    if (!params.query) {
      return expenses;
    }

    const query = params.query.toLowerCase();
    return expenses
      .filter((expense) => {
        // Search in merchant name, description, and other text fields
        const merchantName = expense.merchant?.name?.toLowerCase() || '';
        const description = expense.details?.description?.toLowerCase() || '';
        // Category might be in customFieldValues or not available
        const category = '';

        return (
          merchantName.includes(query) || description.includes(query) || category.includes(query)
        );
      })
      .slice(0, params.limit || 50);
  }

  /**
   * Gets available expense categories
   *
   * @returns Promise resolving to array of categories
   */
  async getCategories(): Promise<Category[]> {
    // Hardcoded categories based on common expense types
    // In production, this would fetch from an API endpoint
    return [
      {
        id: 'meals',
        name: 'Meals & Entertainment',
        description: 'Business meals and entertainment',
      },
      { id: 'travel', name: 'Travel', description: 'Transportation and travel expenses' },
      { id: 'lodging', name: 'Lodging', description: 'Hotels and accommodations' },
      { id: 'supplies', name: 'Office Supplies', description: 'Office supplies and equipment' },
      { id: 'software', name: 'Software', description: 'Software licenses and subscriptions' },
      { id: 'hardware', name: 'Hardware', description: 'Computer hardware and equipment' },
      { id: 'training', name: 'Training', description: 'Professional development and training' },
      { id: 'other', name: 'Other', description: 'Other business expenses' },
    ];
  }

  /**
   * Gets expense statistics based on filters
   *
   * @param filters - Optional filters to apply before calculating stats
   * @returns Promise resolving to expense statistics
   */
  async getStats(filters?: ExpenseFilters): Promise<ExpenseStats> {
    const response = await this.fetchExpenses(filters);
    const expenses = response.data;

    const stats: ExpenseStats = {
      totalAmount: 0,
      totalCount: expenses.length,
      averageAmount: 0,
      byCategory: {},
      byStatus: {},
    };

    expenses.forEach((expense) => {
      const amount = expense.merchantAmount || expense.accountAmount || 0;
      stats.totalAmount += amount;

      // Group by category
      // Category might be in customFieldValues or not available
      const category = 'uncategorized';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = { amount: 0, count: 0 };
      }
      stats.byCategory[category].amount += amount;
      stats.byCategory[category].count += 1;

      // Group by status
      const status = expense.status || 'unknown';
      if (!stats.byStatus[status]) {
        stats.byStatus[status] = { amount: 0, count: 0 };
      }
      stats.byStatus[status].amount += amount;
      stats.byStatus[status].count += 1;
    });

    stats.averageAmount = stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0;

    return stats;
  }

  /**
   * Validates expense data before creation
   *
   * @param data - Expense data to validate
   * @returns Validation result with isValid flag and any errors
   */
  validateExpenseData(data: ExpenseCreatePayload): ValidationResult {
    const errors: string[] = [];

    // Required field validations
    if (!data.merchantAmount || data.merchantAmount <= 0) {
      errors.push('Merchant amount must be greater than 0');
    }

    if (!data.merchantCurrency || data.merchantCurrency.length !== 3) {
      errors.push('Merchant currency must be a valid 3-letter code');
    }

    if (!data.date || !this.isValidDate(data.date)) {
      errors.push('Date must be a valid ISO date string');
    }

    if (!data.merchant?.name || data.merchant.name.trim().length === 0) {
      errors.push('Merchant name is required');
    }

    // Business rule validations
    if (data.merchantAmount > 10000) {
      errors.push('Expenses over $10,000 require special approval');
    }

    const expenseDate = new Date(data.date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 90) {
      errors.push('Expenses older than 90 days require justification');
    }

    if (expenseDate > today) {
      errors.push('Expense date cannot be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : [],
      data: errors.length === 0 ? data : undefined,
    };
  }

  /**
   * Helper method to validate date strings
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

// Export pre-configured instance
export const extendedExpenseManager = new ExtendedExpenseManager();
