import { Category } from '../../../../features/expenses/manager-extended';
import { ExpenseData } from '../../../../features/expenses/types';
import {
  Action,
  createAction,
  Reducer,
  StateManager,
} from '../../../shared/services/state-manager';

// Re-export ExpenseData for convenience
export { ExpenseData };

/**
 * Expense UI state structure
 */
export interface ExpenseUIState {
  items: ExpenseData[];
  selectedId: string | null;
  filters: {
    sortOrder:
      | 'date-desc'
      | 'date-asc'
      | 'amount-desc'
      | 'amount-asc'
      | 'merchant-asc'
      | 'merchant-desc';
    itemsPerPage: 20 | 50 | 100;
    merchantCategory: string;
    expenseStatus: string;
    searchQuery: string;
  };
  categories: Category[];
  loading: boolean;
  error: Error | null;
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Initial state
 */
const initialState: ExpenseUIState = {
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

/**
 * Action creators
 */
export const expenseActions = {
  // Data actions
  setExpenses: createAction<ExpenseData[]>('expenses/setExpenses'),
  setSelectedExpense: createAction<string | null>('expenses/setSelectedExpense'),
  setCategories: createAction<Category[]>('expenses/setCategories'),

  // Filter actions
  setSortOrder: createAction<ExpenseUIState['filters']['sortOrder']>('expenses/setSortOrder'),
  setItemsPerPage: createAction<ExpenseUIState['filters']['itemsPerPage']>(
    'expenses/setItemsPerPage'
  ),
  setMerchantCategory: createAction<string>('expenses/setMerchantCategory'),
  setExpenseStatus: createAction<string>('expenses/setExpenseStatus'),
  setSearchQuery: createAction<string>('expenses/setSearchQuery'),
  clearFilters: createAction<void>('expenses/clearFilters'),

  // Pagination actions
  setCurrentPage: createAction<number>('expenses/setCurrentPage'),
  setPaginationInfo: createAction<{ currentPage: number; totalPages: number; totalItems: number }>(
    'expenses/setPaginationInfo'
  ),

  // Loading/error actions
  setLoading: createAction<boolean>('expenses/setLoading'),
  setError: createAction<Error | null>('expenses/setError'),
  clearError: createAction<void>('expenses/clearError'),
};

/**
 * Action types union
 */
type ExpenseAction =
  | (Action<ExpenseData[]> & { type: 'expenses/setExpenses' })
  | (Action<string | null> & { type: 'expenses/setSelectedExpense' })
  | (Action<Category[]> & { type: 'expenses/setCategories' })
  | (Action<ExpenseUIState['filters']['sortOrder']> & { type: 'expenses/setSortOrder' })
  | (Action<ExpenseUIState['filters']['itemsPerPage']> & { type: 'expenses/setItemsPerPage' })
  | (Action<string> & { type: 'expenses/setMerchantCategory' })
  | (Action<string> & { type: 'expenses/setExpenseStatus' })
  | (Action<string> & { type: 'expenses/setSearchQuery' })
  | (Action<void> & { type: 'expenses/clearFilters' })
  | (Action<number> & { type: 'expenses/setCurrentPage' })
  | (Action<{ currentPage: number; totalPages: number; totalItems: number }> & {
      type: 'expenses/setPaginationInfo';
    })
  | (Action<boolean> & { type: 'expenses/setLoading' })
  | (Action<Error | null> & { type: 'expenses/setError' })
  | (Action<void> & { type: 'expenses/clearError' });

/**
 * Reducer
 */
function expenseReducer(state = initialState, action: ExpenseAction): ExpenseUIState {
  switch (action.type) {
    case 'expenses/setExpenses':
      return { ...state, items: action.payload || [] };

    case 'expenses/setSelectedExpense':
      return { ...state, selectedId: action.payload || null };

    case 'expenses/setCategories':
      return { ...state, categories: action.payload || [] };

    case 'expenses/setSortOrder':
      return {
        ...state,
        filters: { ...state.filters, sortOrder: action.payload || 'date-desc' },
        currentPage: 1, // Reset to first page on filter change
      };

    case 'expenses/setItemsPerPage':
      return {
        ...state,
        filters: { ...state.filters, itemsPerPage: action.payload || 20 },
        currentPage: 1,
      };

    case 'expenses/setMerchantCategory':
      return {
        ...state,
        filters: { ...state.filters, merchantCategory: action.payload || '' },
        currentPage: 1,
      };

    case 'expenses/setExpenseStatus':
      return {
        ...state,
        filters: { ...state.filters, expenseStatus: action.payload as string },
        currentPage: 1,
      };

    case 'expenses/setSearchQuery':
      return {
        ...state,
        filters: { ...state.filters, searchQuery: action.payload as string },
        currentPage: 1,
      };

    case 'expenses/clearFilters':
      return {
        ...state,
        filters: {
          ...state.filters,
          merchantCategory: '',
          expenseStatus: '',
          searchQuery: '',
        },
        currentPage: 1,
      };

    case 'expenses/setCurrentPage':
      return { ...state, currentPage: action.payload as number };

    case 'expenses/setPaginationInfo':
      const paginationInfo = action.payload as {
        currentPage: number;
        totalPages: number;
        totalItems: number;
      };
      return {
        ...state,
        currentPage: paginationInfo.currentPage,
        totalPages: paginationInfo.totalPages,
        totalItems: paginationInfo.totalItems,
      };

    case 'expenses/setLoading':
      return { ...state, loading: action.payload as boolean };

    case 'expenses/setError':
      return { ...state, error: action.payload as Error | null, loading: false };

    case 'expenses/clearError':
      return { ...state, error: null };

    default:
      return state;
  }
}

/**
 * Create and export the expense store
 */
export class ExpenseStore extends StateManager<ExpenseUIState> {
  constructor() {
    super(initialState, expenseReducer as Reducer<ExpenseUIState, Action>);

    // Load saved preferences from chrome storage
    void this.loadPreferences();
  }

  private async loadPreferences() {
    try {
      const result = await chrome.storage.local.get(['expensePreferences']);
      if (result.expensePreferences) {
        const { sortOrder, itemsPerPage, merchantCategory, expenseStatus } =
          result.expensePreferences;

        if (sortOrder) this.dispatch(expenseActions.setSortOrder(sortOrder));
        if (itemsPerPage) this.dispatch(expenseActions.setItemsPerPage(itemsPerPage));
        if (merchantCategory) this.dispatch(expenseActions.setMerchantCategory(merchantCategory));
        if (expenseStatus) this.dispatch(expenseActions.setExpenseStatus(expenseStatus));
      }
    } catch {
      // Failed to load expense preferences
    }
  }

  /**
   * Save current preferences to chrome storage
   */
  async savePreferences() {
    const state = this.getState();
    try {
      await chrome.storage.local.set({
        expensePreferences: {
          sortOrder: state.filters.sortOrder,
          itemsPerPage: state.filters.itemsPerPage,
          merchantCategory: state.filters.merchantCategory,
          expenseStatus: state.filters.expenseStatus,
        },
      });
    } catch {
      // Failed to save expense preferences
    }
  }
}

// Export singleton instance
export const expenseStore = new ExpenseStore();
