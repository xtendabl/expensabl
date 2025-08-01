import { GetStatisticsHandler } from '../get-statistics.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('GetStatisticsHandler', () => {
  let handler: GetStatisticsHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    mockDeps = {
      tokenManager: {
        get: jest.fn(),
        save: jest.fn(),
        clear: jest.fn(),
        isValid: jest.fn(),
        hasToken: jest.fn(),
      } as any,
      expenseManager: {} as any,
      templateManager: {
        listTemplates: jest.fn(),
      } as any,
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

    handler = new GetStatisticsHandler();
  });

  describe('action', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.GET_STATISTICS);
    });
  });

  describe('execute', () => {
    it('should fetch statistics successfully with token', async () => {
      (mockDeps.tokenManager.hasToken as jest.Mock).mockResolvedValue(true);
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue('test-token');
      (mockDeps.tokenManager.isValid as jest.Mock).mockResolvedValue(true);
      (mockDeps.templateManager.listTemplates as jest.Mock).mockResolvedValue({
        items: [
          { id: '1', name: 'Template 1', scheduling: { enabled: true } },
          { id: '2', name: 'Template 2', scheduling: { enabled: false } },
          { id: '3', name: 'Template 3', scheduling: { enabled: true } },
        ],
      });

      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.hasToken).toBe(true);
      expect((response.data as any)?.isValid).toBe(true);
      expect((response.data as any)?.templatesCreated).toBe(3);
      expect((response.data as any)?.templatesScheduled).toBe(2);
      expect((response.data as any)?.expensesCreated).toBe(0);
    });

    it('should fetch statistics successfully without token', async () => {
      (mockDeps.tokenManager.hasToken as jest.Mock).mockResolvedValue(false);
      (mockDeps.templateManager.listTemplates as jest.Mock).mockResolvedValue({
        items: [],
      });

      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.hasToken).toBe(false);
      expect((response.data as any)?.isValid).toBe(false);
      expect((response.data as any)?.templatesCreated).toBe(0);
      expect((response.data as any)?.templatesScheduled).toBe(0);

      // Should not call isValid if no token
      expect(mockDeps.tokenManager.isValid).not.toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      (mockDeps.tokenManager.hasToken as jest.Mock).mockResolvedValue(true);
      (mockDeps.tokenManager.get as jest.Mock).mockResolvedValue('invalid-token');
      (mockDeps.tokenManager.isValid as jest.Mock).mockResolvedValue(false);
      (mockDeps.templateManager.listTemplates as jest.Mock).mockResolvedValue({
        items: [],
      });

      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.hasToken).toBe(true);
      expect((response.data as any)?.isValid).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to get templates');
      (mockDeps.templateManager.listTemplates as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to get templates');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'GetStatisticsHandler: Failed to fetch statistics',
        { error }
      );
    });

    it('should log operations', async () => {
      (mockDeps.tokenManager.hasToken as jest.Mock).mockResolvedValue(false);
      (mockDeps.templateManager.listTemplates as jest.Mock).mockResolvedValue({ items: [] });

      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetStatisticsHandler: Fetching statistics'
      );
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'GetStatisticsHandler: Statistics calculated',
        {
          hasToken: false,
          isValid: false,
          templatesCreated: 0,
          templatesScheduled: 0,
          expensesCreated: 0,
        }
      );
    });
  });
});
