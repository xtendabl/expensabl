import { ImportTokensHandler } from '../import-tokens.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('ImportTokensHandler', () => {
  let handler: ImportTokensHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    mockDeps = {
      tokenManager: {
        get: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
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
      receiptService: {
        uploadReceipt: jest.fn(),
        deleteReceipt: jest.fn(),
        getReceiptUrl: jest.fn(),
      } as any,
    };

    mockSender = {
      id: 'test-extension',
      tab: { id: 1 },
    } as chrome.runtime.MessageSender;

    handler = new ImportTokensHandler();
  });

  describe('action', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.IMPORT_TOKENS);
    });
  });

  describe('execute', () => {
    it('should import tokens successfully', async () => {
      const tokens = {
        auth: 'token-123',
        refresh: 'refresh-456',
      };

      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.requested).toBe(2);
      expect((response.data as any)?.imported).toBe(2);
      expect((response.data as any)?.skipped).toBe(0);

      expect(mockDeps.tokenManager.save).toHaveBeenCalledWith('token-123', 'auth');
      expect(mockDeps.tokenManager.save).toHaveBeenCalledWith('refresh-456', 'refresh');
    });

    it('should skip masked tokens', async () => {
      const tokens = {
        auth: 'token-123...abc',
        refresh: 'valid-token',
      };

      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.requested).toBe(2);
      expect((response.data as any)?.imported).toBe(1);
      expect((response.data as any)?.skipped).toBe(1);

      expect(mockDeps.tokenManager.save).toHaveBeenCalledTimes(1);
      expect(mockDeps.tokenManager.save).toHaveBeenCalledWith('valid-token', 'refresh');
    });

    it('should handle empty tokens', async () => {
      const tokens = {};

      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.requested).toBe(0);
      expect((response.data as any)?.imported).toBe(0);
      expect((response.data as any)?.skipped).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Storage failed');
      (mockDeps.tokenManager.save as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens: { auth: 'token' } },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage failed');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'ImportTokensHandler: Failed to import tokens',
        { error }
      );
    });

    it('should validate payload', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens: null as any },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Tokens must be an object');
    });

    it('should validate token values are strings', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens: { auth: 123 as any } },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid token value for key auth');
    });

    it('should log operations', async () => {
      const tokens = { auth: 'token' };
      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens },
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith('ImportTokensHandler: Importing tokens', {
        tokenCount: 1,
      });
      expect(mockDeps.logger.info).toHaveBeenCalledWith('ImportTokensHandler: Import completed', {
        requested: 1,
        imported: 1,
        skipped: 0,
      });
    });
  });
});
