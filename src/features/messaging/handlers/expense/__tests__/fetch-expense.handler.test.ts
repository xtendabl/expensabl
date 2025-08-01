import { FetchExpenseHandler } from '../fetch-expense.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('FetchExpenseHandler', () => {
  let handler: FetchExpenseHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new FetchExpenseHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {
        fetchExpense: jest.fn(),
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
      expect(handler.action).toBe(MessageAction.FETCH_EXPENSE);
    });
  });

  describe('Validation', () => {
    it('should fail when expenseId is missing', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: {
          // Missing expenseId
        },
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Expense ID is required');
      expect(mockDeps.expenseManager.fetchExpense).not.toHaveBeenCalled();
    });

    it('should fail when payload is missing', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        // Missing payload
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Expense ID is required');
      expect(mockDeps.expenseManager.fetchExpense).not.toHaveBeenCalled();
    });

    it('should accept valid expenseId', async () => {
      const mockExpense = {
        id: 'exp-123',
        uuid: 'uuid-123',
        merchantAmount: 100,
        merchantCurrency: 'USD',
        merchant: { name: 'Test Merchant' },
      };
      (mockDeps.expenseManager.fetchExpense as jest.Mock).mockResolvedValue(mockExpense);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: {
          expenseId: 'exp-123',
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpense);
    });
  });

  describe('Successful Execution', () => {
    it('should fetch expense and return result', async () => {
      const expenseId = 'exp-456';
      const mockExpense = {
        id: expenseId,
        uuid: 'uuid-456',
        merchantAmount: 250.5,
        merchantCurrency: 'EUR',
        date: '2024-02-15',
        merchant: { name: 'European Merchant' },
        details: { category: 'Travel' },
      };

      (mockDeps.expenseManager.fetchExpense as jest.Mock).mockResolvedValue(mockExpense);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: { expenseId },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpense);
      expect(mockDeps.expenseManager.fetchExpense).toHaveBeenCalledWith(expenseId);
    });

    it('should log debug messages with expenseId', async () => {
      const expenseId = 'exp-789';
      const mockExpense = {
        id: expenseId,
        merchantAmount: 100,
      };

      (mockDeps.expenseManager.fetchExpense as jest.Mock).mockResolvedValue(mockExpense);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: { expenseId },
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.debug).toHaveBeenCalledWith('Expense fetched successfully', {
        expenseId,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle expenseManager.fetchExpense errors', async () => {
      const error = new Error('Expense not found');
      (mockDeps.expenseManager.fetchExpense as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: { expenseId: 'non-existent' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Expense not found');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'fetchExpense failed',
        expect.objectContaining({
          action: 'fetchExpense',
          error,
          duration: expect.any(Number),
          sender: 'test-sender',
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      (mockDeps.expenseManager.fetchExpense as jest.Mock).mockRejectedValue('String error');

      const message: BackgroundMessage = {
        action: MessageAction.FETCH_EXPENSE,
        payload: { expenseId: 'exp-123' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });
  });
});
