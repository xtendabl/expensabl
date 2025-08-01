import { ExportTokensHandler } from '../export-tokens.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('ExportTokensHandler', () => {
  let handler: ExportTokensHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    mockDeps = {
      tokenManager: {
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn(),
        isValid: jest.fn(),
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

    mockSender = {
      id: 'test-extension',
      tab: { id: 1 },
    } as chrome.runtime.MessageSender;

    handler = new ExportTokensHandler();
  });

  describe('action', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.EXPORT_TOKENS);
    });
  });

  describe('execute', () => {
    it('should export tokens successfully when token exists', async () => {
      const mockToken = 'test-token-12345-abcdef';
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue(mockToken);

      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect((response.data as any)?.tokens).toHaveLength(1);
      expect((response.data as any)?.tokens[0].token).toBe('test-token...cdef');
      expect((response.data as any)?.exportedAt).toBeDefined();
      expect((response.data as any)?.version).toBe('1.0.0');
    });

    it('should export empty tokens array when no token exists', async () => {
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue(null);

      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.tokens).toHaveLength(0);
    });

    it('should not mask short tokens', async () => {
      const shortToken = 'short';
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue(shortToken);

      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect((response.data as any)?.tokens[0].token).toBe('short');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Token retrieval failed');
      (mockDeps.tokenManager.get as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Token retrieval failed');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'ExportTokensHandler: Failed to export tokens',
        { error }
      );
    });

    it('should log operations', async () => {
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue('test-token');

      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith('ExportTokensHandler: Exporting tokens');
      expect(mockDeps.logger.info).toHaveBeenCalledWith('ExportTokensHandler: Export completed', {
        tokenCount: 1,
      });
    });
  });
});
