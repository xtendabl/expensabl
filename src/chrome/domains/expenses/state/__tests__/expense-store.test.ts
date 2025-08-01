import { ExpenseStore, expenseActions, ExpenseUIState } from '../expense-store';
import { ExpenseData } from '../../../../../features/expenses/types';
import { Category } from '../../../../../features/expenses/manager-extended';
import { createMockExpense, createMockCategory } from '../../__tests__/test-helpers';

// Mock chrome storage API
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
  },
};
(global as any).chrome = { storage: mockChromeStorage };

describe('ExpenseStore', () => {
  let store: ExpenseStore;
  let initialState: ExpenseUIState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeStorage.local.get.mockResolvedValue({});
    store = new ExpenseStore();
    initialState = {
      items: [],
      selectedId: null,
      filters: {
        sortOrder: 'date-desc',
        itemsPerPage: 20,
        merchantCategory: '',
        expenseStatus: '',
        searchQuery: '',
      },
      categories: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
    };
  });

  const mockExpenses: ExpenseData[] = [
    createMockExpense({
      uuid: '1',
      accountAmount: 100,
      merchantAmount: 100,
      merchantCurrency: 'USD',
    }),
    createMockExpense({
      uuid: '2',
      accountAmount: 200,
      merchantAmount: 200,
      merchantCurrency: 'USD',
    }),
  ];

  const mockCategories: Category[] = [
    createMockCategory({ id: '1', name: 'Travel' }),
    createMockCategory({ id: '2', name: 'Food' }),
  ];

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState();
      expect(state).toEqual(initialState);
    });

    it('should load preferences from chrome storage on init', async () => {
      const savedPreferences = {
        sortOrder: 'amount-desc',
        itemsPerPage: 50,
        merchantCategory: 'travel',
        expenseStatus: 'approved',
      };

      mockChromeStorage.local.get.mockResolvedValue({
        expensePreferences: savedPreferences,
      });

      // Create new store instance to trigger preference loading
      const newStore = new ExpenseStore();

      // Wait for async loading
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = newStore.getState();
      expect(state.filters.sortOrder).toBe('amount-desc');
      expect(state.filters.itemsPerPage).toBe(50);
      expect(state.filters.merchantCategory).toBe('travel');
      expect(state.filters.expenseStatus).toBe('approved');
    });
  });

  describe('data actions', () => {
    it('should set expenses array', () => {
      store.dispatch(expenseActions.setExpenses(mockExpenses));

      const state = store.getState();
      expect(state.items).toEqual(mockExpenses);
    });

    it('should set selected expense ID', () => {
      store.dispatch(expenseActions.setSelectedExpense('123'));

      const state = store.getState();
      expect(state.selectedId).toBe('123');
    });

    it('should set categories array', () => {
      store.dispatch(expenseActions.setCategories(mockCategories));

      const state = store.getState();
      expect(state.categories).toEqual(mockCategories);
    });
  });

  describe('filter actions', () => {
    it('should update sort order and reset page', () => {
      store.dispatch(expenseActions.setCurrentPage(3));
      store.dispatch(expenseActions.setSortOrder('amount-desc'));

      const state = store.getState();
      expect(state.filters.sortOrder).toBe('amount-desc');
      expect(state.currentPage).toBe(1);
    });

    it('should update items per page and reset page', () => {
      store.dispatch(expenseActions.setCurrentPage(3));
      store.dispatch(expenseActions.setItemsPerPage(50));

      const state = store.getState();
      expect(state.filters.itemsPerPage).toBe(50);
      expect(state.currentPage).toBe(1);
    });

    it('should update merchant category and reset page', () => {
      store.dispatch(expenseActions.setCurrentPage(3));
      store.dispatch(expenseActions.setMerchantCategory('travel'));

      const state = store.getState();
      expect(state.filters.merchantCategory).toBe('travel');
      expect(state.currentPage).toBe(1);
    });

    it('should update expense status and reset page', () => {
      store.dispatch(expenseActions.setCurrentPage(3));
      store.dispatch(expenseActions.setExpenseStatus('approved'));

      const state = store.getState();
      expect(state.filters.expenseStatus).toBe('approved');
      expect(state.currentPage).toBe(1);
    });

    it('should update search query and reset page', () => {
      store.dispatch(expenseActions.setCurrentPage(3));
      store.dispatch(expenseActions.setSearchQuery('coffee'));

      const state = store.getState();
      expect(state.filters.searchQuery).toBe('coffee');
      expect(state.currentPage).toBe(1);
    });

    it('should clear filters but keep sort order and items per page', () => {
      // Set all filters
      store.dispatch(expenseActions.setSortOrder('amount-desc'));
      store.dispatch(expenseActions.setItemsPerPage(50));
      store.dispatch(expenseActions.setMerchantCategory('travel'));
      store.dispatch(expenseActions.setExpenseStatus('approved'));
      store.dispatch(expenseActions.setSearchQuery('hotel'));

      // Clear filters
      store.dispatch(expenseActions.clearFilters());

      const state = store.getState();
      expect(state.filters.sortOrder).toBe('amount-desc');
      expect(state.filters.itemsPerPage).toBe(50);
      expect(state.filters.merchantCategory).toBe('');
      expect(state.filters.expenseStatus).toBe('');
      expect(state.filters.searchQuery).toBe('');
    });
  });

  describe('pagination actions', () => {
    it('should update current page', () => {
      store.dispatch(expenseActions.setCurrentPage(5));

      const state = store.getState();
      expect(state.currentPage).toBe(5);
    });

    it('should update pagination info (currentPage, totalPages, totalItems)', () => {
      store.dispatch(
        expenseActions.setPaginationInfo({
          currentPage: 3,
          totalPages: 10,
          totalItems: 195,
        })
      );

      const state = store.getState();
      expect(state.currentPage).toBe(3);
      expect(state.totalPages).toBe(10);
      expect(state.totalItems).toBe(195);
    });
  });

  describe('loading and error actions', () => {
    it('should set loading state', () => {
      store.dispatch(expenseActions.setLoading(true));

      const state = store.getState();
      expect(state.loading).toBe(true);
    });

    it('should set error and clear loading', () => {
      store.dispatch(expenseActions.setLoading(true));
      const error = new Error('Test error');
      store.dispatch(expenseActions.setError(error));

      const state = store.getState();
      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });

    it('should clear error', () => {
      const error = new Error('Test error');
      store.dispatch(expenseActions.setError(error));
      store.dispatch(expenseActions.clearError());

      const state = store.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('preferences', () => {
    it('should save preferences to chrome storage', async () => {
      store.dispatch(expenseActions.setSortOrder('amount-desc'));
      store.dispatch(expenseActions.setItemsPerPage(50));
      store.dispatch(expenseActions.setMerchantCategory('travel'));
      store.dispatch(expenseActions.setExpenseStatus('approved'));

      await store.savePreferences();

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        expensePreferences: {
          sortOrder: 'amount-desc',
          itemsPerPage: 50,
          merchantCategory: 'travel',
          expenseStatus: 'approved',
        },
      });
    });

    it('should load preferences from chrome storage', async () => {
      const savedPreferences = {
        sortOrder: 'merchant-asc',
        itemsPerPage: 100,
        merchantCategory: 'food',
        expenseStatus: 'rejected',
      };

      mockChromeStorage.local.get.mockResolvedValue({
        expensePreferences: savedPreferences,
      });

      await store['loadPreferences']();

      const state = store.getState();
      expect(state.filters.sortOrder).toBe('merchant-asc');
      expect(state.filters.itemsPerPage).toBe(100);
      expect(state.filters.merchantCategory).toBe('food');
      expect(state.filters.expenseStatus).toBe('rejected');
    });

    it('should handle chrome storage errors gracefully', async () => {
      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(store.savePreferences()).resolves.toBeUndefined();

      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(store['loadPreferences']()).resolves.toBeUndefined();
    });
  });

  describe('state management', () => {
    it('should notify subscribers on state changes', () => {
      const subscriber = jest.fn();
      store.subscribe(subscriber);

      store.dispatch(expenseActions.setExpenses(mockExpenses));

      expect(subscriber).toHaveBeenCalled();
    });

    it('should return current state via getState', () => {
      store.dispatch(expenseActions.setExpenses(mockExpenses));
      store.dispatch(expenseActions.setSelectedExpense('123'));

      const state = store.getState();
      expect(state.items).toEqual(mockExpenses);
      expect(state.selectedId).toBe('123');
    });

    it('should handle multiple subscribers', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();

      store.subscribe(subscriber1);
      store.subscribe(subscriber2);

      store.dispatch(expenseActions.setExpenses(mockExpenses));

      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const subscriber = jest.fn();
      const unsubscribe = store.subscribe(subscriber);

      unsubscribe();
      store.dispatch(expenseActions.setExpenses(mockExpenses));

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('reducer edge cases', () => {
    it('should handle undefined payloads', () => {
      store.dispatch(expenseActions.setExpenses(undefined as any));
      store.dispatch(expenseActions.setSelectedExpense(undefined as any));
      store.dispatch(expenseActions.setCategories(undefined as any));

      const state = store.getState();
      expect(state.items).toEqual([]);
      expect(state.selectedId).toBeNull();
      expect(state.categories).toEqual([]);
    });

    it('should handle unknown action types', () => {
      const stateBefore = store.getState();
      store.dispatch({ type: 'UNKNOWN_ACTION' } as any);
      const stateAfter = store.getState();

      expect(stateAfter).toEqual(stateBefore);
    });

    it('should maintain immutability', () => {
      const stateBefore = store.getState();
      const itemsBefore = stateBefore.items;

      store.dispatch(expenseActions.setExpenses(mockExpenses));

      const stateAfter = store.getState();
      expect(stateBefore).not.toBe(stateAfter);
      expect(itemsBefore).not.toBe(stateAfter.items);
    });
  });
});
