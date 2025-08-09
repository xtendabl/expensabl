import { OpenSidePanelHandler } from '../open-side-panel.handler';
import { MessageAction, HandlerDependencies, BackgroundMessage } from '../../../types';

describe('OpenSidePanelHandler', () => {
  let handler: OpenSidePanelHandler;
  let mockDeps: HandlerDependencies;
  let mockSender: chrome.runtime.MessageSender;
  let originalSidePanel: typeof chrome.sidePanel;

  beforeEach(() => {
    // Ensure chrome global exists
    if (!(global as any).chrome) {
      (global as any).chrome = {};
    }

    // Save original sidePanel
    originalSidePanel = (global as any).chrome.sidePanel;

    // Mock chrome.sidePanel API
    (global as any).chrome.sidePanel = {
      open: jest.fn().mockResolvedValue(undefined),
      setOptions: jest.fn().mockResolvedValue(undefined),
    };

    mockDeps = {
      tokenManager: {} as any,
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
      receiptService: {} as any,
    };

    mockSender = {
      id: 'test-extension',
      tab: { id: 1, windowId: 123 },
    } as chrome.runtime.MessageSender;

    handler = new OpenSidePanelHandler();
  });

  afterEach(() => {
    // Restore original sidePanel
    (global as any).chrome.sidePanel = originalSidePanel;
  });

  describe('action', () => {
    it('should have correct action', () => {
      expect(handler.action).toBe(MessageAction.OPEN_SIDE_PANEL);
    });
  });

  describe('execute', () => {
    it('should open side panel with window ID from sender', async () => {
      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.opened).toBe(true);
      expect((response.data as any)?.windowId).toBe(123);

      expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 123 });
      expect(mockDeps.logger.info).toHaveBeenCalledWith('OpenSidePanelHandler: Side panel opened', {
        windowId: 123,
      });
    });

    it('should open side panel without window ID when sender has no tab', async () => {
      const senderWithoutTab = { id: 'test-extension' } as chrome.runtime.MessageSender;

      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const response = await handler.handle(message, senderWithoutTab, mockDeps);

      expect(response.success).toBe(true);
      expect((response.data as any)?.opened).toBe(true);
      expect((response.data as any)?.windowId).toBeUndefined();

      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        enabled: true,
        path: 'sidepanel.html',
      });
      expect(mockDeps.logger.info).toHaveBeenCalledWith('OpenSidePanelHandler: Side panel enabled');
    });

    it('should handle missing sidePanel API', async () => {
      // Remove sidePanel API
      delete (global as any).chrome.sidePanel;

      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Side panel API not available');
    });

    it('should handle errors from sidePanel.open', async () => {
      const error = new Error('Failed to open panel');
      ((global as any).chrome.sidePanel.open as jest.Mock).mockRejectedValue(error);

      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const response = await handler.handle(message, mockSender, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to open panel');
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        'OpenSidePanelHandler: Failed to open side panel',
        { error }
      );
    });

    it('should handle errors from sidePanel.setOptions', async () => {
      const error = new Error('Failed to set options');
      ((global as any).chrome.sidePanel.setOptions as jest.Mock).mockRejectedValue(error);

      const senderWithoutTab = { id: 'test-extension' } as chrome.runtime.MessageSender;
      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const response = await handler.handle(message, senderWithoutTab, mockDeps);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to set options');
    });

    it('should log operations', async () => {
      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      await handler.handle(message, mockSender, mockDeps);

      expect(mockDeps.logger.info).toHaveBeenCalledWith('OpenSidePanelHandler: Opening side panel');
      expect(mockDeps.logger.info).toHaveBeenCalledWith('OpenSidePanelHandler: Side panel opened', {
        windowId: 123,
      });
    });
  });
});
