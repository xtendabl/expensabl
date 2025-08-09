import { GetCategoriesHandler } from '../get-categories.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('GetCategoriesHandler', () => {
  let handler: GetCategoriesHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new GetCategoriesHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {
        getCategories: jest.fn(),
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
      expect(handler.action).toBe(MessageAction.GET_EXPENSE_CATEGORIES);
    });
  });

  describe('Validation', () => {
    it('should accept empty message (no payload required)', async () => {
      const mockCategories = ['Travel', 'Food', 'Entertainment'];
      (mockDeps.expenseManager.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCategories);
    });

    it('should accept message with payload (ignored)', async () => {
      const mockCategories = ['Travel', 'Food'];
      (mockDeps.expenseManager.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
        payload: { someField: 'ignored' },
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCategories);
    });
  });

  describe('Successful Execution', () => {
    it('should fetch categories and return array', async () => {
      const mockCategories = [
        'Travel',
        'Food & Dining',
        'Shopping',
        'Entertainment',
        'Transportation',
        'Bills & Utilities',
      ];

      (mockDeps.expenseManager.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCategories);
      expect(mockDeps.expenseManager.getCategories).toHaveBeenCalledWith();
    });

    it('should handle empty categories array', async () => {
      const mockCategories: string[] = [];

      (mockDeps.expenseManager.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('should log info messages before and after fetch', async () => {
      const mockCategories = ['Travel', 'Food', 'Shopping'];
      (mockDeps.expenseManager.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      await handler.handle(message, mockSender, mockDeps);

      // Before fetch
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetCategoriesHandler: Fetching expense categories'
      );

      // After fetch
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetCategoriesHandler: Categories fetched',
        { count: 3 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle expenseManager.getCategories errors', async () => {
      const error = new Error('Failed to fetch categories');
      (mockDeps.expenseManager.getCategories as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to fetch categories');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'getExpenseCategories failed',
        expect.objectContaining({
          action: 'getExpenseCategories',
          error,
          duration: expect.any(Number),
          sender: 'test-sender',
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      (mockDeps.expenseManager.getCategories as jest.Mock).mockRejectedValue('Database error');

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });

    it('should log info message before error occurs', async () => {
      const error = new Error('Network failure');
      (mockDeps.expenseManager.getCategories as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.GET_EXPENSE_CATEGORIES,
      };

      await handler.handle(message, mockSender, mockDeps);

      // Should still log the initial info message
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetCategoriesHandler: Fetching expense categories'
      );
    });
  });
});
