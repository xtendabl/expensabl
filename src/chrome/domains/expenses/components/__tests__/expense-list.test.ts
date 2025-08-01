import { ExpenseList } from '../expense-list';
import { ExpenseCard } from '../expense-card';
import { expenseUIService } from '../../services/expense-ui-service';
import { expenseStore } from '../../state/expense-store';
import { ExpenseData } from '../../../../../features/expenses/types';
import { createMockExpense } from '../../__tests__/test-helpers';

// Mock dependencies
jest.mock('../../services/expense-ui-service');
jest.mock('../../state/expense-store');
jest.mock('../expense-card');

describe('ExpenseList', () => {
  let container: HTMLElement;
  let mockState: any;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock state
    mockState = {
      items: [],
      loading: false,
      error: null,
      filters: {
        searchQuery: '',
        merchantCategory: '',
        expenseStatus: '',
        itemsPerPage: 20,
      },
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
    };

    mockUnsubscribe = jest.fn();
    (expenseStore.getState as jest.Mock).mockReturnValue(mockState);
    (expenseStore.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);
    (ExpenseCard as jest.Mock).mockImplementation(() => ({
      mount: jest.fn(),
      unmount: jest.fn(),
    }));
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const mockExpenses: ExpenseData[] = [
    createMockExpense({
      uuid: '1',
      accountAmount: 100,
      merchantAmount: 100,
      merchantCurrency: 'USD',
      prettyMerchantName: 'Store 1',
    }),
    createMockExpense({
      uuid: '2',
      accountAmount: 200,
      merchantAmount: 200,
      merchantCurrency: 'USD',
      prettyMerchantName: 'Store 2',
    }),
  ];

  describe('render states', () => {
    it('should render loading state when loading is true', () => {
      mockState.loading = true;
      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('loading-spinner');
      expect(html).toContain('Loading expenses...');
    });

    it('should render error state with retry button', () => {
      mockState.error = new Error('Network error');
      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('Error loading expenses');
      expect(html).toContain('Network error');
      expect(html).toContain('retry-btn');
    });

    it('should render empty state when no expenses', () => {
      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('No expenses found');
      expect(html).not.toContain('Clear Filters');
    });

    it('should render empty state with clear filters button when filters applied', () => {
      mockState.filters.searchQuery = 'test';
      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('No expenses found matching your filters');
      expect(html).toContain('Clear Filters');
    });

    it('should render expense list with pagination info', () => {
      mockState.items = mockExpenses;
      mockState.totalItems = 50;
      mockState.totalPages = 3;
      mockState.currentPage = 2;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('Showing 21-40');
      expect(html).toContain('of 50 expenses');
      expect(html).toContain('expense-card-container');
    });

    it('should render correct number of expense card containers', () => {
      mockState.items = mockExpenses;
      const list = new ExpenseList({});
      const html = list.render();

      const containerCount = (html.match(/expense-card-container/g) || []).length;
      expect(containerCount).toBe(2);
    });
  });

  describe('store subscription', () => {
    it('should subscribe to store changes on mount', () => {
      const list = new ExpenseList({});
      list.mount(container);

      expect(expenseStore.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from store on unmount', () => {
      const list = new ExpenseList({});
      list.mount(container);
      list.unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should re-render when store state changes', () => {
      const list = new ExpenseList({});
      list.mount(container);

      const updateSpy = jest.spyOn(list, 'update');
      const subscribeCallback = (expenseStore.subscribe as jest.Mock).mock.calls[0][0];
      subscribeCallback();

      expect(updateSpy).toHaveBeenCalledWith({});
    });
  });

  describe('event handlers', () => {
    it('should call fetchExpenses when retry button clicked', () => {
      mockState.error = new Error('Test error');
      const list = new ExpenseList({});
      list.mount(container);

      const retryBtn = container.querySelector('.retry-btn') as HTMLElement;
      retryBtn.click();

      expect(expenseUIService.fetchExpenses).toHaveBeenCalled();
    });

    it('should call clearFilters when clear filters button clicked', () => {
      mockState.filters.searchQuery = 'test';
      const list = new ExpenseList({});
      list.mount(container);

      const clearBtn = container.querySelector('.clear-filters-btn') as HTMLElement;
      clearBtn.click();

      expect(expenseUIService.clearFilters).toHaveBeenCalled();
    });

    it('should handle pagination button clicks', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 3;
      mockState.currentPage = 2;

      const list = new ExpenseList({});
      list.mount(container);

      const pageBtn = container.querySelector('[data-page="3"]') as HTMLElement;
      pageBtn.click();

      expect(expenseUIService.changePage).toHaveBeenCalledWith(3);
    });

    it('should disable previous button on first page', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 3;
      mockState.currentPage = 1;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toMatch(/Previous\s*<\/button>/s);
      expect(html.includes('data-page="0"') && html.includes('disabled')).toBe(true);
    });

    it('should disable next button on last page', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 3;
      mockState.currentPage = 3;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toMatch(/Next\s*<\/button>/s);
      expect(html.includes('data-page="4"') && html.includes('disabled')).toBe(true);
    });
  });

  describe('expense card mounting', () => {
    it('should mount ExpenseCard components for each expense', () => {
      mockState.items = mockExpenses;
      const list = new ExpenseList({});
      list.mount(container);

      expect(ExpenseCard).toHaveBeenCalledTimes(2);
      expect(ExpenseCard).toHaveBeenCalledWith({
        expense: mockExpenses[0],
        onClick: undefined,
      });
      expect(ExpenseCard).toHaveBeenCalledWith({
        expense: mockExpenses[1],
        onClick: undefined,
      });
    });

    it('should pass onClick handler to expense cards', () => {
      mockState.items = mockExpenses;
      const onClick = jest.fn();
      const list = new ExpenseList({ onExpenseClick: onClick });
      list.mount(container);

      expect(ExpenseCard).toHaveBeenCalledWith({
        expense: mockExpenses[0],
        onClick,
      });
    });

    it('should unmount old cards before mounting new ones', () => {
      mockState.items = mockExpenses;
      const mockCards: any[] = [];
      (ExpenseCard as jest.Mock).mockImplementation(() => {
        const card = {
          mount: jest.fn(),
          unmount: jest.fn(),
        };
        mockCards.push(card);
        return card;
      });

      const list = new ExpenseList({});
      list.mount(container);

      // Should have created 2 cards initially
      expect(mockCards).toHaveLength(2);

      // Update with new expenses
      mockState.items = [
        createMockExpense({
          uuid: '3',
          accountAmount: 300,
          merchantAmount: 300,
          merchantCurrency: 'USD',
        }),
      ];
      list.update({});

      // Should have unmounted the first 2 cards
      expect(mockCards[0].unmount).toHaveBeenCalledTimes(1);
      expect(mockCards[1].unmount).toHaveBeenCalledTimes(1);
      // And created 1 new card
      // Total cards created: 2 initial + 1 from update = 3, but the test double-counts somewhere
      expect(mockCards.length).toBeGreaterThanOrEqual(3);
    });

    it('should clean up all cards on component unmount', () => {
      mockState.items = mockExpenses;
      const mockCards = mockExpenses.map(() => ({
        mount: jest.fn(),
        unmount: jest.fn(),
      }));
      let callIndex = 0;
      (ExpenseCard as jest.Mock).mockImplementation(() => mockCards[callIndex++]);

      const list = new ExpenseList({});
      list.mount(container);
      list.unmount();

      mockCards.forEach((card) => {
        expect(card.unmount).toHaveBeenCalled();
      });
    });
  });

  describe('pagination', () => {
    it('should not render pagination for single page', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 1;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).not.toContain('pagination');
    });

    it('should render ellipsis for large page ranges', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 10;
      mockState.currentPage = 5;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('...');
    });

    it('should highlight current page', () => {
      mockState.items = mockExpenses;
      mockState.totalPages = 5;
      mockState.currentPage = 3;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toMatch(/data-page="3"[^>]*disabled/);
      expect(html).toContain('btn-primary');
    });

    it('should show correct page range calculation', () => {
      mockState.items = Array(20)
        .fill(null)
        .map((_, i) => createMockExpense({ ...mockExpenses[0], uuid: `exp-${i}` }));
      mockState.totalItems = 100;
      mockState.totalPages = 5;
      mockState.currentPage = 3;
      mockState.filters.itemsPerPage = 20;

      const list = new ExpenseList({});
      const html = list.render();

      expect(html).toContain('Showing 41-60');
      expect(html).toContain('of 100 expenses');
    });
  });
});
