import { SearchParams } from '../../../../features/expenses/manager-extended';
import { ExpenseCreatePayload, ExpenseData } from '../../../../features/expenses/types';
import { messagingFacade } from '../../../shared/services/messaging-facade';
import { expenseActions, expenseStore } from '../state/expense-store';

/**
 * Service that coordinates expense operations between UI components and backend
 */
export class ExpenseUIService {
  /**
   * Fetches expenses with current filters and updates the store
   */
  async fetchExpenses(): Promise<void> {
    const state = expenseStore.getState();

    try {
      expenseStore.dispatch(expenseActions.setLoading(true));
      expenseStore.dispatch(expenseActions.clearError());

      // Fetch expenses based on current search query
      let expenses: ExpenseData[];

      if (state.filters.searchQuery) {
        // Use search endpoint if query exists
        const searchParams: SearchParams = {
          query: state.filters.searchQuery,
          limit: 1000, // Get all for client-side pagination
          filters: {
            status: state.filters.expenseStatus || undefined,
            merchant: state.filters.merchantCategory || undefined,
          },
        };
        expenses = await messagingFacade.expenses.search(searchParams);
      } else {
        // Use regular fetch with filters
        const response = await messagingFacade.expenses.fetch({
          status: state.filters.expenseStatus || undefined,
          merchant: state.filters.merchantCategory || undefined,
        });
        expenses = response;
      }

      // Apply client-side sorting
      expenses = this.sortExpenses(expenses, state.filters.sortOrder);

      // Calculate pagination
      const totalItems = expenses.length;
      const totalPages = Math.ceil(totalItems / state.filters.itemsPerPage);
      const currentPage = Math.min(state.currentPage, totalPages) || 1;

      // Get items for current page
      const startIndex = (currentPage - 1) * state.filters.itemsPerPage;
      const endIndex = startIndex + state.filters.itemsPerPage;
      const paginatedExpenses = expenses.slice(startIndex, endIndex);

      // Update store
      expenseStore.dispatch(expenseActions.setExpenses(paginatedExpenses));
      expenseStore.dispatch(
        expenseActions.setPaginationInfo({
          currentPage,
          totalPages,
          totalItems,
        })
      );
    } catch (error) {
      expenseStore.dispatch(
        expenseActions.setError(
          error instanceof Error ? error : new Error('Failed to fetch expenses')
        )
      );
    } finally {
      expenseStore.dispatch(expenseActions.setLoading(false));
    }
  }

  /**
   * Fetches a single expense and sets it as selected
   */
  async fetchExpenseDetails(expenseId: string): Promise<ExpenseData | null> {
    try {
      expenseStore.dispatch(expenseActions.setLoading(true));
      expenseStore.dispatch(expenseActions.clearError());

      const expense = await messagingFacade.expenses.fetchOne(expenseId);
      expenseStore.dispatch(expenseActions.setSelectedExpense(expenseId));

      return expense;
    } catch (error) {
      expenseStore.dispatch(
        expenseActions.setError(
          error instanceof Error ? error : new Error('Failed to fetch expense details')
        )
      );
      return null;
    } finally {
      expenseStore.dispatch(expenseActions.setLoading(false));
    }
  }

  /**
   * Creates a new expense
   */
  async createExpense(data: ExpenseCreatePayload): Promise<ExpenseData | null> {
    try {
      expenseStore.dispatch(expenseActions.setLoading(true));
      expenseStore.dispatch(expenseActions.clearError());

      // Validate first
      const validation = await messagingFacade.expenses.validate(data);
      if (!validation.isValid) {
        throw new Error(validation.errors?.join(', ') || 'Validation failed');
      }

      const expense = await messagingFacade.expenses.create(data);

      // Refresh expense list
      await this.fetchExpenses();

      return expense;
    } catch (error) {
      expenseStore.dispatch(
        expenseActions.setError(
          error instanceof Error ? error : new Error('Failed to create expense')
        )
      );
      return null;
    } finally {
      expenseStore.dispatch(expenseActions.setLoading(false));
    }
  }

  /**
   * Duplicates an expense with today's date
   */
  async duplicateExpense(originalExpense: ExpenseData): Promise<ExpenseData | null> {
    const today = new Date().toISOString();

    const newExpenseData: ExpenseCreatePayload = {
      date: today,
      merchant: originalExpense.merchant || { name: 'Unknown Merchant' },
      merchantAmount: originalExpense.merchantAmount || originalExpense.accountAmount || 0,
      merchantCurrency:
        originalExpense.merchantCurrency || originalExpense.accountCurrency || 'USD',
      policyType: originalExpense.policy || undefined,
      details: {
        ...originalExpense.details,
        description: `Duplicate of ${originalExpense.merchant?.name || 'expense'}`,
      },
      reportingData: originalExpense.reportingData || undefined,
    };

    return this.createExpense(newExpenseData);
  }

  /**
   * Fetches expense categories if not already loaded
   */
  async fetchCategories(): Promise<void> {
    const state = expenseStore.getState();

    // Skip if already loaded
    if (state.categories.length > 0) {
      return;
    }

    try {
      const categories = await messagingFacade.expenses.getCategories();
      expenseStore.dispatch(expenseActions.setCategories(categories));
    } catch {
      // Failed to fetch categories
      // Non-critical error, don't update error state
    }
  }

  /**
   * Updates filters and refetches expenses
   */
  async updateFilters(
    filters: Partial<typeof expenseStore.getState.prototype.filters>
  ): Promise<void> {
    // Update individual filters
    if (filters.sortOrder !== undefined) {
      expenseStore.dispatch(expenseActions.setSortOrder(filters.sortOrder));
    }
    if (filters.itemsPerPage !== undefined) {
      expenseStore.dispatch(expenseActions.setItemsPerPage(filters.itemsPerPage));
    }
    if (filters.merchantCategory !== undefined) {
      expenseStore.dispatch(expenseActions.setMerchantCategory(filters.merchantCategory));
    }
    if (filters.expenseStatus !== undefined) {
      expenseStore.dispatch(expenseActions.setExpenseStatus(filters.expenseStatus));
    }
    if (filters.searchQuery !== undefined) {
      expenseStore.dispatch(expenseActions.setSearchQuery(filters.searchQuery));
    }

    // Save preferences
    await expenseStore.savePreferences();

    // Refetch with new filters
    await this.fetchExpenses();
  }

  /**
   * Clears filters and refetches
   */
  async clearFilters(): Promise<void> {
    expenseStore.dispatch(expenseActions.clearFilters());
    await expenseStore.savePreferences();
    await this.fetchExpenses();
  }

  /**
   * Changes page and refetches
   */
  async changePage(page: number): Promise<void> {
    expenseStore.dispatch(expenseActions.setCurrentPage(page));
    await this.fetchExpenses();
  }

  /**
   * Client-side expense sorting
   */
  private sortExpenses(expenses: ExpenseData[], sortOrder: string): ExpenseData[] {
    const sorted = [...expenses];

    switch (sortOrder) {
      case 'date-desc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.dateCreated || a.authorizationDate || a.instant || 0).getTime();
          const dateB = new Date(b.dateCreated || b.authorizationDate || b.instant || 0).getTime();
          return dateB - dateA;
        });

      case 'date-asc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.dateCreated || a.authorizationDate || a.instant || 0).getTime();
          const dateB = new Date(b.dateCreated || b.authorizationDate || b.instant || 0).getTime();
          return dateA - dateB;
        });

      case 'amount-desc':
        return sorted.sort((a, b) => (b.accountAmount || 0) - (a.accountAmount || 0));

      case 'amount-asc':
        return sorted.sort((a, b) => (a.accountAmount || 0) - (b.accountAmount || 0));

      case 'merchant-asc':
        return sorted.sort((a, b) => {
          const merchantA = (a.prettyMerchantName || a.merchant?.name || '').toLowerCase();
          const merchantB = (b.prettyMerchantName || b.merchant?.name || '').toLowerCase();
          return merchantA.localeCompare(merchantB);
        });

      case 'merchant-desc':
        return sorted.sort((a, b) => {
          const merchantA = (a.prettyMerchantName || a.merchant?.name || '').toLowerCase();
          const merchantB = (b.prettyMerchantName || b.merchant?.name || '').toLowerCase();
          return merchantB.localeCompare(merchantA);
        });

      default:
        return sorted;
    }
  }
}

// Export singleton instance
export const expenseUIService = new ExpenseUIService();
