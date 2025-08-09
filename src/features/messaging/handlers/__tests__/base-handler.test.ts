import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  BackgroundMessage,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

// Test implementation of BaseHandler
class TestHandler extends BaseHandler<{ action: MessageAction.GET_TOKEN }> {
  readonly action = MessageAction.GET_TOKEN;

  protected async execute(
    _message: { action: MessageAction.GET_TOKEN },
    _sender: chrome.runtime.MessageSender,
    _deps: HandlerDependencies
  ) {
    return createSuccessResponse({ test: 'data' });
  }
}

// Test handler with validation
class ValidatingHandler extends BaseHandler<{
  action: MessageAction.CREATE_EXPENSE;
  payload: any;
}> {
  readonly action = MessageAction.CREATE_EXPENSE;

  protected validate(message: { action: MessageAction.CREATE_EXPENSE; payload: any }) {
    if (!message.payload) {
      return { isValid: false, error: 'Payload required' };
    }
    return { isValid: true };
  }

  protected async execute(
    _message: { action: MessageAction.CREATE_EXPENSE; payload: any },
    _sender: chrome.runtime.MessageSender,
    _deps: HandlerDependencies
  ) {
    return createSuccessResponse({ created: true });
  }
}

describe('BaseHandler', () => {
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {} as any,
      templateManager: {} as any,
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        levels: {} as any,
        currentLevel: 'debug' as any,
        log: jest.fn(),
        getConsoleMethod: jest.fn(),
        setLevel: jest.fn(),
      } as any,
      schedulingEngine: {
        scheduleTemplate: jest.fn(),
        cancelTemplateAlarm: jest.fn(),
      } as any,
      receiptService: {} as any,
    };

    mockSender = { id: 'test-sender' } as chrome.runtime.MessageSender;
  });

  describe('Basic functionality', () => {
    it('should handle messages with correct action', async () => {
      const handler = new TestHandler();
      const message: BackgroundMessage = { action: MessageAction.GET_TOKEN };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ test: 'data' });
      expect(mockDeps.logger.debug).toHaveBeenCalledWith('Processing getToken', expect.any(Object));
      expect(mockDeps.logger.debug).toHaveBeenCalledWith('getToken completed', expect.any(Object));
    });

    it('should reject messages with incorrect action', async () => {
      const handler = new TestHandler();
      const message: BackgroundMessage = { action: MessageAction.CLEAR_TOKENS };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid action for handler');
      expect(mockDeps.logger.debug).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      class ErrorHandler extends BaseHandler<{ action: MessageAction.GET_TOKEN }> {
        readonly action = MessageAction.GET_TOKEN;

        protected async execute(
          _message: { action: MessageAction.GET_TOKEN },
          _sender: chrome.runtime.MessageSender,
          _deps: HandlerDependencies
        ): Promise<any> {
          throw new Error('Test error');
        }
      }

      const handler = new ErrorHandler();
      const message: BackgroundMessage = { action: MessageAction.GET_TOKEN };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'getToken failed',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('Validation', () => {
    it('should validate messages before execution', async () => {
      const handler = new ValidatingHandler();
      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        payload: {
          merchantAmount: 100,
          merchantCurrency: 'USD',
          date: '2024-01-01',
          merchant: { name: 'Test Merchant' },
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ created: true });
    });

    it('should reject invalid messages', async () => {
      const handler = new ValidatingHandler();
      const message: BackgroundMessage = {
        action: MessageAction.CREATE_EXPENSE,
        // Missing payload
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Payload required');
      expect(mockDeps.logger.debug).toHaveBeenCalledTimes(1); // Only the initial log
    });
  });

  describe('Performance tracking', () => {
    it('should track execution duration', async () => {
      const handler = new TestHandler();
      const message: BackgroundMessage = { action: MessageAction.GET_TOKEN };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.debug).toHaveBeenCalledWith(
        'getToken completed',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        })
      );
    });
  });
});
