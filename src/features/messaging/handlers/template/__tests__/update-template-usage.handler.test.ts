import { UpdateTemplateUsageHandler } from '../update-template-usage.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';
import { ExpenseTemplate } from '../../../../templates/types';

describe('UpdateTemplateUsageHandler', () => {
  let handler: UpdateTemplateUsageHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;
  let mockTemplate: ExpenseTemplate;

  beforeEach(() => {
    mockTemplate = {
      id: 'template-123',
      name: 'Test Template',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 5000,
      version: '1.0',
      expenseData: {
        amount: 100,
        categoryId: 'travel',
        currency: 'USD',
        description: 'Test expense',
      },
      scheduling: null,
      executionHistory: [],
      metadata: {
        createdFrom: 'manual',
        tags: [],
        favorite: false,
        useCount: 5,
        scheduledUseCount: 0,
        lastUsed: Date.now() - 1000,
      },
    } as ExpenseTemplate;

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {} as any,
      templateManager: {
        getTemplate: jest.fn(),
        updateTemplate: jest.fn(),
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

    handler = new UpdateTemplateUsageHandler();
  });

  describe('action', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.UPDATE_TEMPLATE_USAGE);
    });
  });

  describe('execute', () => {
    it('should update template usage successfully', async () => {
      const updatedTemplate = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          useCount: 6,
          lastUsed: Date.now(),
        },
      };

      (mockDeps.templateManager.getTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue(updatedTemplate);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'template-123' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedTemplate);
      expect((response.data as any)?.metadata?.useCount).toBe(6);

      expect(mockDeps.templateManager.getTemplate).toHaveBeenCalledWith('template-123');
      expect(mockDeps.templateManager.updateTemplate).toHaveBeenCalledWith(
        'template-123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            useCount: 6,
            lastUsed: expect.any(Number),
          }),
        })
      );
    });

    it('should handle template not found', async () => {
      (mockDeps.templateManager.getTemplate as jest.Mock).mockResolvedValue(null);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'non-existent' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Template not found: non-existent');
      expect(mockDeps.templateManager.updateTemplate).not.toHaveBeenCalled();
    });

    it('should initialize useCount if not present', async () => {
      const templateWithoutCount = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          useCount: undefined,
          lastUsed: Date.now() - 1000,
        },
      } as any;
      const updatedTemplate = {
        ...templateWithoutCount,
        metadata: {
          useCount: 1,
          lastUsed: Date.now(),
        },
      };

      (mockDeps.templateManager.getTemplate as jest.Mock).mockResolvedValue(templateWithoutCount);
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue(updatedTemplate);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'template-123' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.metadata?.useCount).toBe(1);
    });

    it('should validate payload', async () => {
      const invalidMessages = [
        { action: MessageAction.UPDATE_TEMPLATE_USAGE, payload: null },
        { action: MessageAction.UPDATE_TEMPLATE_USAGE, payload: {} },
        { action: MessageAction.UPDATE_TEMPLATE_USAGE, payload: { templateId: null } },
        { action: MessageAction.UPDATE_TEMPLATE_USAGE, payload: { templateId: 123 } },
      ];

      for (const message of invalidMessages) {
        const response = await handler.handle(message as BackgroundMessage, mockSender, mockDeps);
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      }
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Update failed');
      (mockDeps.templateManager.getTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'template-123' },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Update failed');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'UpdateTemplateUsageHandler: Failed to update usage',
        { error }
      );
    });

    it('should log operations', async () => {
      (mockDeps.templateManager.getTemplate as jest.Mock).mockResolvedValue(mockTemplate);
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue({
        ...mockTemplate,
        metadata: { useCount: 6 },
      });

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'template-123' },
      };

      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'UpdateTemplateUsageHandler: Updating template usage',
        { templateId: 'template-123' }
      );
      expect(mockDeps.logger.info).toHaveBeenCalledWith(
        'UpdateTemplateUsageHandler: Template usage updated',
        {
          templateId: 'template-123',
          newCount: 6,
        }
      );
    });
  });
});
