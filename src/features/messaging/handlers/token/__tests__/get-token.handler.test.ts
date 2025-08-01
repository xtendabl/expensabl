import { GetTokenHandler } from '../get-token.handler';
import { MessageAction, HandlerDependencies } from '../../../types';

describe('GetTokenHandler', () => {
  let handler: GetTokenHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new GetTokenHandler();

    mockDeps = {
      tokenManager: {
        get: jest.fn(),
      } as any,
      expenseManager: {} as any,
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
      expect(handler.action).toBe(MessageAction.GET_TOKEN);
    });
  });

  describe('Successful Execution', () => {
    it('should return token when available', async () => {
      const mockToken = 'test-token-123';
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue(mockToken);

      const message = { action: MessageAction.GET_TOKEN } as any;
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ token: mockToken });
      expect(mockDeps.tokenManager.get).toHaveBeenCalled();
    });

    it('should return null token when not available', async () => {
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue(null);

      const message = { action: MessageAction.GET_TOKEN } as any;
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ token: null });
    });
  });

  describe('Error Handling', () => {
    it('should handle token manager errors', async () => {
      const error = new Error('Token storage error');
      (mockDeps.tokenManager.get as jest.Mock).mockRejectedValue(error);

      const message = { action: MessageAction.GET_TOKEN } as any;
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Token storage error');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'getToken failed',
        expect.objectContaining({ error })
      );
    });

    it('should reject wrong action', async () => {
      const message = { action: MessageAction.CLEAR_TOKENS } as any;
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid action for handler');
      expect(mockDeps.tokenManager.get).not.toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log execution details', async () => {
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue('token');

      const message = { action: MessageAction.GET_TOKEN } as any;
      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.debug).toHaveBeenCalledWith(
        'Processing getToken',
        expect.objectContaining({
          action: MessageAction.GET_TOKEN,
          sender: 'test-sender',
          hasPayload: false,
        })
      );

      expect(mockDeps.logger.debug).toHaveBeenCalledWith(
        'getToken completed',
        expect.objectContaining({
          action: MessageAction.GET_TOKEN,
          success: true,
          duration: expect.any(Number),
          hasData: true,
        })
      );
    });
  });
});
