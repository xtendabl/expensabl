import { SearchExpensesHandler } from '../search-expenses.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('SearchExpensesHandler', () => {
  let handler: SearchExpensesHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new SearchExpensesHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {
        fetchExpenses: jest.fn(),
      } as any,
      templateManager: {} as any,
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      } as any,
      schedulingEngine: {
        scheduleTemplate: jest.fn(),
        cancelTemplateAlarm: jest.fn(),
      } as any,
      receiptService: {
        uploadReceipt: jest.fn(),
        deleteReceipt: jest.fn(),
        getReceiptUrl: jest.fn(),
      } as any,
    };

    mockSender = { id: 'test-sender' } as chrome.runtime.MessageSender;
  });

  describe('Handler Properties', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.FETCH_EXPENSES);
    });
  });

  describe('Validation', () => {
    it('should accept missing payload', async () => {
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 100 },
          { id: 'exp-2', merchantAmount: 200 },
        ],
      };
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: mockExpenses.data });
    });

    it('should validate dateFrom format', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: {
          dateFrom: 'invalid-date-format',
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid dateFrom format');
      expect(mockDeps.expenseManager.fetchExpenses).not.toHaveBeenCalled();
    });

    it('should validate dateTo format', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: {
          dateTo: '2024-13-45', // Invalid date
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid dateTo format');
      expect(mockDeps.expenseManager.fetchExpenses).not.toHaveBeenCalled();
    });

    it('should validate minAmount is a number', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: {
          minAmount: 'not-a-number' as any,
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('minAmount must be a number');
      expect(mockDeps.expenseManager.fetchExpenses).not.toHaveBeenCalled();
    });

    it('should accept valid date formats', async () => {
      const mockExpenses = { data: [] };
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: {
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
    });

    it('should accept valid minAmount', async () => {
      const mockExpenses = { data: [] };
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: {
          minAmount: 100.5,
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
    });
  });

  describe('Successful Execution', () => {
    it('should search all expenses when no filters', async () => {
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 100, merchant: { name: 'Store A' } },
          { id: 'exp-2', merchantAmount: 200, merchant: { name: 'Store B' } },
          { id: 'exp-3', merchantAmount: 300, merchant: { name: 'Store C' } },
        ],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: mockExpenses.data });
      expect(mockDeps.expenseManager.fetchExpenses).toHaveBeenCalledWith({});
    });

    it('should search with date filters', async () => {
      const mockExpenses = {
        data: [{ id: 'exp-1', merchantAmount: 100, date: '2024-06-15' }],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const filters = {
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
      };

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: mockExpenses.data });
      expect(mockDeps.expenseManager.fetchExpenses).toHaveBeenCalledWith(filters);
    });

    it('should search with amount filters', async () => {
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 500 },
          { id: 'exp-2', merchantAmount: 1000 },
        ],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const filters = {
        minAmount: 250,
      };

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: mockExpenses.data });
      expect(mockDeps.expenseManager.fetchExpenses).toHaveBeenCalledWith(filters);
    });

    it('should handle empty results', async () => {
      const mockExpenses = {
        data: [],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: { category: 'NonExistent' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: [] });
    });

    it('should handle null data in response', async () => {
      const mockExpenses = {
        data: null,
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ items: [] });
    });

    it('should log info messages with filter details', async () => {
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 100 },
          { id: 'exp-2', merchantAmount: 200 },
        ],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'SearchExpensesHandler: Fetching expenses',
        {
          hasFilters: true,
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        }
      );

      expect(mockDeps.logger.info).toHaveBeenCalledWith('SearchExpensesHandler: Fetch completed', {
        resultCount: 2,
      });
    });

    it('should log correctly when no filters provided', async () => {
      const mockExpenses = { data: null };
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'SearchExpensesHandler: Fetching expenses',
        {
          hasFilters: false,
          dateFrom: undefined,
          dateTo: undefined,
        }
      );

      expect(mockDeps.logger.info).toHaveBeenCalledWith('SearchExpensesHandler: Fetch completed', {
        resultCount: 0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle expenseManager.fetchExpenses errors', async () => {
      const error = new Error('Search query failed');
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: { minAmount: 100 },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Search query failed');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'SearchExpensesHandler: Failed to search expenses',
        error
      );
    });

    it('should return proper error messages for non-Error exceptions', async () => {
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockRejectedValue('Network timeout');

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to search expenses');
    });

    it('should log errors with context', async () => {
      const error = new Error('Database error');
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockRejectedValue(error);

      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        minAmount: 50,
      };

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'SearchExpensesHandler: Fetching expenses',
        {
          hasFilters: true,
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        }
      );

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'SearchExpensesHandler: Failed to search expenses',
        error
      );
    });
  });
});
