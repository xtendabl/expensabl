import { FetchExpensesHandler } from '../fetch-expenses.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('FetchExpensesHandler', () => {
  let handler: FetchExpensesHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new FetchExpensesHandler();

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
    };

    mockSender = { id: 'test-sender' } as chrome.runtime.MessageSender;
  });

  describe('Handler Properties', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.FETCH_EXPENSES);
    });
  });

  describe('Successful Execution', () => {
    it('should fetch all expenses when no payload provided', async () => {
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 100, merchant: { name: 'Merchant 1' } },
          { id: 'exp-2', merchantAmount: 200, merchant: { name: 'Merchant 2' } },
        ],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        // No payload
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpenses);
      expect(mockDeps.expenseManager.fetchExpenses).toHaveBeenCalledWith(undefined);
    });

    it('should fetch expenses with filters when payload provided', async () => {
      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        category: 'Travel',
      };

      const mockExpenses = {
        data: [{ id: 'exp-3', merchantAmount: 300, category: 'Travel' }],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpenses);
      expect(mockDeps.expenseManager.fetchExpenses).toHaveBeenCalledWith(filters);
    });

    it('should handle empty result set', async () => {
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
      expect(response.data).toEqual(mockExpenses);
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
      expect(response.data).toEqual(mockExpenses);
    });

    it('should log debug messages with count and filter status', async () => {
      const filters = { dateFrom: '2024-01-01' };
      const mockExpenses = {
        data: [
          { id: 'exp-1', merchantAmount: 100 },
          { id: 'exp-2', merchantAmount: 200 },
          { id: 'exp-3', merchantAmount: 300 },
        ],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: filters,
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.debug).toHaveBeenCalledWith('Expenses fetched successfully', {
        count: 3,
        hasFilters: true,
      });
    });

    it('should log correct count when no filters provided', async () => {
      const mockExpenses = {
        data: [{ id: 'exp-1' }],
      };

      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockResolvedValue(mockExpenses);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.debug).toHaveBeenCalledWith('Expenses fetched successfully', {
        count: 1,
        hasFilters: false,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle expenseManager.fetchExpenses errors', async () => {
      const error = new Error('Failed to fetch expenses');
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
        payload: { category: 'Travel' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to fetch expenses');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'fetchExpenses failed',
        expect.objectContaining({
          action: 'fetchExpenses',
          error,
          duration: expect.any(Number),
          sender: 'test-sender',
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      (mockDeps.expenseManager.fetchExpenses as jest.Mock).mockRejectedValue('Network error');

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });
  });
});
