import { CreateExpenseHandler } from '../create-expense.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('CreateExpenseHandler', () => {
  let handler: CreateExpenseHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new CreateExpenseHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {
        createExpense: jest.fn(),
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
      receiptService: {} as any,
    };

    mockSender = { id: 'test-sender' } as chrome.runtime.MessageSender;
  });

  describe('Handler Properties', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.CREATE_EXPENSE);
    });
  });

  describe('Validation', () => {
    it('should validate presence of payload', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        // Missing payload
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Expense data is required');
      expect(mockDeps.expenseManager.createExpense).not.toHaveBeenCalled();
    });

    it('should accept valid payload', async () => {
      const validPayload = {
        merchantAmount: 100,
        merchantCurrency: 'USD',
        date: '2024-01-01',
        merchant: { name: 'Test Merchant' },
      };

      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload: validPayload,
      };

      const mockExpense = {
        id: 'exp-123',
        uuid: 'uuid-123',
        ...validPayload,
      };
      (mockDeps.expenseManager.createExpense as jest.Mock).mockResolvedValue(mockExpense);

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpense);
    });
  });

  describe('Successful Execution', () => {
    it('should create expense and return result', async () => {
      const payload = {
        merchantAmount: 250.5,
        merchantCurrency: 'EUR',
        date: '2024-02-15',
        merchant: { name: 'European Merchant' },
        details: { category: 'Travel' },
      };

      const createdExpense = {
        id: 'exp-456',
        uuid: 'uuid-456',
        ...payload,
      };

      (mockDeps.expenseManager.createExpense as jest.Mock).mockResolvedValue(createdExpense);

      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload,
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdExpense);
      expect(mockDeps.expenseManager.createExpense).toHaveBeenCalledWith(payload);

      // Should log handler call and success
      expect(mockDeps.logger.info).toHaveBeenCalledWith('[CREATE_EXPENSE] Handler called', {
        requestId: undefined,
        timestamp: expect.any(Number),
        merchantAmount: 250.5,
        merchant: 'European Merchant',
      });
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        '[CREATE_EXPENSE] Expense created successfully',
        {
          expenseId: 'uuid-456',
          amount: 250.5,
          requestId: undefined,
        }
      );
    });

    it('should use id if uuid not available', async () => {
      const createdExpense = {
        id: 'exp-789',
        // No uuid
        merchantAmount: 100,
      };

      (mockDeps.expenseManager.createExpense as jest.Mock).mockResolvedValue(createdExpense);

      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload: {
          merchantAmount: 100,
          merchantCurrency: 'USD',
          date: '2024-01-01',
          merchant: { name: 'Test' },
        },
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        '[CREATE_EXPENSE] Expense created successfully',
        {
          expenseId: 'exp-789',
          amount: 100,
          requestId: undefined,
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle expense creation errors', async () => {
      const error = new Error('API error: insufficient funds');
      (mockDeps.expenseManager.createExpense as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload: {
          merchantAmount: 1000,
          merchantCurrency: 'USD',
          date: '2024-01-01',
          merchant: { name: 'Expensive Merchant' },
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('API error: insufficient funds');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'createExpense failed',
        expect.objectContaining({
          action: 'createExpense',
          error,
          duration: expect.any(Number),
          sender: 'test-sender',
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      (mockDeps.expenseManager.createExpense as jest.Mock).mockRejectedValue('String error');

      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload: {
          merchantAmount: 50,
          merchantCurrency: 'USD',
          date: '2024-01-01',
          merchant: { name: 'Test' },
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown error occurred');
    });
  });
});
