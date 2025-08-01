import { GetExpenseStatsHandler } from '../get-expense-stats.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('GetExpenseStatsHandler', () => {
  let handler: GetExpenseStatsHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new GetExpenseStatsHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {
        getStats: jest.fn(),
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
      expect(handler.action).toBe(MessageAction.GET_STATISTICS);
    });
  });

  describe('Validation', () => {
    it('should accept missing payload (all stats)', async () => {
      const mockStats = {
        totalAmount: 1000,
        totalCount: 10,
        byCategory: { Travel: 500, Food: 500 },
      };
      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const message = {
        action: MessageAction.GET_STATISTICS,
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
    });

    it('should validate startDate format', async () => {
      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: 'invalid-date',
        },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid start date format');
      expect(mockDeps.expenseManager.getStats).not.toHaveBeenCalled();
    });

    it('should validate endDate format', async () => {
      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          endDate: 'not-a-date',
        },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid end date format');
      expect(mockDeps.expenseManager.getStats).not.toHaveBeenCalled();
    });

    it('should ensure startDate is before endDate', async () => {
      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: '2024-12-31',
          endDate: '2024-01-01',
        },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Start date must be before end date');
      expect(mockDeps.expenseManager.getStats).not.toHaveBeenCalled();
    });

    it('should validate groupBy values', async () => {
      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          groupBy: 'invalid' as any,
        },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid groupBy value');
      expect(mockDeps.expenseManager.getStats).not.toHaveBeenCalled();
    });

    it('should accept valid groupBy values', async () => {
      const mockStats = {
        totalAmount: 1000,
        totalCount: 10,
        byCategory: {},
      };
      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const validGroupByValues = ['day', 'week', 'month', 'category'];

      for (const groupBy of validGroupByValues) {
        const message = {
          action: MessageAction.GET_STATISTICS,
          payload: { groupBy: groupBy as any },
        } as BackgroundMessage;

        const response = await handler.handle(message, mockSender, mockDeps);

        expect(response.success).toBe(true);
      }
    });
  });

  describe('Successful Execution', () => {
    it('should fetch stats without filters', async () => {
      const mockStats = {
        totalAmount: 5000,
        totalCount: 50,
        byCategory: {
          Travel: 2000,
          Food: 1500,
          Shopping: 1000,
          Other: 500,
        },
      };

      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const message = {
        action: MessageAction.GET_STATISTICS,
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
      expect(mockDeps.expenseManager.getStats).toHaveBeenCalledWith({});
    });

    it('should fetch stats with date range', async () => {
      const mockStats = {
        totalAmount: 3000,
        totalCount: 30,
        byCategory: { Travel: 3000 },
      };

      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockStats);
      expect(mockDeps.expenseManager.getStats).toHaveBeenCalledWith({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      });
    });

    it('should convert StatsParams to ExpenseFilters correctly', async () => {
      const mockStats = {
        totalAmount: 1000,
        totalCount: 10,
        byCategory: {},
      };

      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: '2024-06-01',
          endDate: '2024-06-30',
          groupBy: 'month',
        },
      } as BackgroundMessage;

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.expenseManager.getStats).toHaveBeenCalledWith({
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
      });
    });

    it('should log info messages with stats summary', async () => {
      const mockStats = {
        totalAmount: 2500.75,
        totalCount: 25,
        byCategory: {
          Travel: 1000,
          Food: 750.75,
          Entertainment: 500,
          Other: 250,
        },
      };

      (mockDeps.expenseManager.getStats as jest.Mock).mockResolvedValue(mockStats);

      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: '2024-01-01',
        },
      } as BackgroundMessage;

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetExpenseStatsHandler: Fetching expense statistics',
        { startDate: '2024-01-01' }
      );

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetExpenseStatsHandler: Statistics calculated',
        {
          totalAmount: 2500.75,
          totalCount: 25,
          categoryCount: 4,
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle expenseManager.getStats errors', async () => {
      const error = new Error('Failed to calculate statistics');
      (mockDeps.expenseManager.getStats as jest.Mock).mockRejectedValue(error);

      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: { startDate: '2024-01-01' },
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to calculate statistics');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'GetExpenseStatsHandler: Failed to fetch statistics',
        error
      );
    });

    it('should return proper error messages for non-Error exceptions', async () => {
      (mockDeps.expenseManager.getStats as jest.Mock).mockRejectedValue('Database connection lost');

      const message = {
        action: MessageAction.GET_STATISTICS,
      } as BackgroundMessage;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to fetch statistics');
    });

    it('should log error with context', async () => {
      const error = new Error('Stats calculation error');
      (mockDeps.expenseManager.getStats as jest.Mock).mockRejectedValue(error);

      const message = {
        action: MessageAction.GET_STATISTICS,
        payload: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'category',
        },
      } as BackgroundMessage;

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetExpenseStatsHandler: Fetching expense statistics',
        {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'category',
        }
      );

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'GetExpenseStatsHandler: Failed to fetch statistics',
        error
      );
    });
  });
});
