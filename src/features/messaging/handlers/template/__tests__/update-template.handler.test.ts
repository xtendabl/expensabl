import { UpdateTemplateHandler } from '../update-template.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('UpdateTemplateHandler', () => {
  let handler: UpdateTemplateHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;

  beforeEach(() => {
    handler = new UpdateTemplateHandler();

    mockDeps = {
      tokenManager: {} as any,
      expenseManager: {} as any,
      templateManager: {
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

    mockSender = { id: 'test-sender' } as chrome.runtime.MessageSender;
  });

  describe('Handler Properties', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.UPDATE_TEMPLATE);
    });
  });

  describe('Validation', () => {
    it('should require templateId', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          // Missing templateId
          updates: { name: 'New Name' },
        },
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Template ID is required');
      expect(mockDeps.templateManager.updateTemplate).not.toHaveBeenCalled();
    });

    it('should require updates data', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          templateId: 'tpl-123',
          // Missing updates
        },
      } as any;

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Update data is required');
      expect(mockDeps.templateManager.updateTemplate).not.toHaveBeenCalled();
    });

    it('should accept valid payload', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          templateId: 'tpl-123',
          updates: { name: 'Updated Template' },
        },
      };

      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue({
        id: 'tpl-123',
        name: 'Updated Template',
      });

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
    });
  });

  describe('Successful Execution', () => {
    it('should update template and return result', async () => {
      const templateId = 'tpl-456';
      const updates = {
        name: 'Monthly Report',
        expenseData: {
          merchantAmount: 500,
          category: 'Office Supplies',
        },
      };

      const updatedTemplate = {
        id: templateId,
        name: 'Monthly Report',
        expenseData: {
          merchantAmount: 500,
          category: 'Office Supplies',
        },
        createdAt: '2024-01-01',
        updatedAt: '2024-02-01',
      };

      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue(updatedTemplate);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: { templateId, updates },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedTemplate);
      expect(mockDeps.templateManager.updateTemplate).toHaveBeenCalledWith(templateId, updates);

      // Should log success
      expect(mockDeps.logger.info).toHaveBeenCalledWith('Template updated successfully', {
        templateId,
      });
    });

    it('should handle partial updates', async () => {
      const templateId = 'tpl-789';
      const updates = { name: 'New Name Only' };

      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue({
        id: templateId,
        name: 'New Name Only',
        expenseData: {
          merchantAmount: 100, // Unchanged
          category: 'Travel', // Unchanged
        },
      });

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: { templateId, updates },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(mockDeps.templateManager.updateTemplate).toHaveBeenCalledWith(templateId, updates);
    });
  });

  describe('Error Handling', () => {
    it('should handle template not found errors', async () => {
      const error = new Error('Template not found');
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          templateId: 'non-existent',
          updates: { name: 'Test' },
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Template not found');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'updateTemplate failed',
        expect.objectContaining({ error })
      );
    });

    it('should handle validation errors from service', async () => {
      const error = new Error('Invalid template data: amount must be positive');
      (mockDeps.templateManager.updateTemplate as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          templateId: 'tpl-123',
          updates: { expenseData: { merchantAmount: -100 } },
        },
      };

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid template data: amount must be positive');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty updates object', async () => {
      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE,
        payload: {
          templateId: 'tpl-123',
          updates: {}, // Empty but valid
        },
      };

      (mockDeps.templateManager.updateTemplate as jest.Mock).mockResolvedValue({
        id: 'tpl-123',
        name: 'Unchanged',
      });

      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect(mockDeps.templateManager.updateTemplate).toHaveBeenCalledWith('tpl-123', {});
    });
  });
});
