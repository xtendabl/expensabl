/**
 * Unit tests for Chrome extension service worker
 */

// Mock dependencies first before any imports
jest.mock('../../features/messaging/router');
jest.mock('../../features/messaging/transport');
jest.mock('../../features/messaging/service-container');
jest.mock('../../shared/services/logger/chrome-logger-setup', () => ({
  chromeLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock Chrome APIs
const mockAddListener = jest.fn();
const mockSetPanelBehavior = jest.fn();
const mockWebRequestAddListener = jest.fn();
const mockNotificationsCreate = jest.fn();
const mockGetAll = jest.fn();

// Define chrome global before loading any modules
(global as any).chrome = {
  runtime: {
    onInstalled: { addListener: mockAddListener },
    onStartup: { addListener: mockAddListener },
    lastError: null,
  },
  sidePanel: {
    setPanelBehavior: mockSetPanelBehavior,
  },
  webRequest: {
    onBeforeSendHeaders: { addListener: mockWebRequestAddListener },
  },
  notifications: {
    create: mockNotificationsCreate,
  },
  alarms: {
    getAll: mockGetAll,
  },
};

// Mock self (service worker global)
const mockSelfAddEventListener = jest.fn();
(global as any).self = {
  addEventListener: mockSelfAddEventListener,
};

// Now import the dependencies
import { ServiceWorkerManager } from '../service-worker';
import { Router } from '../../features/messaging/router';
import {
  getDefaultServiceContainer,
  IServiceContainer,
} from '../../features/messaging/service-container';
import { Transport } from '../../features/messaging/transport';
import { chromeLogger, info, warn } from '../../shared/services/logger/chrome-logger-setup';

describe('ServiceWorkerManager', () => {
  let manager: ServiceWorkerManager;
  let mockRouter: jest.Mocked<Router>;
  let mockTransport: jest.Mocked<Transport>;
  let mockContainer: jest.Mocked<IServiceContainer>;
  let mockTokenManager: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockRouter = {
      handleMessage: jest.fn(),
      getHandlerCount: jest.fn().mockReturnValue(5),
    } as any;

    mockTransport = {
      onMessage: jest.fn().mockReturnValue(jest.fn()),
    } as any;

    mockTokenManager = {
      save: jest.fn(),
    };

    mockContainer = {
      tokenManager: mockTokenManager,
      cleanup: jest.fn(),
    } as any;

    // Mock Router constructor
    (Router as jest.MockedClass<typeof Router>).mockImplementation(() => mockRouter);

    // Mock Transport constructor
    (Transport as jest.MockedClass<typeof Transport>).mockImplementation(() => mockTransport);

    // Mock getDefaultServiceContainer
    (getDefaultServiceContainer as jest.Mock).mockResolvedValue(mockContainer);

    // Mock setPanelBehavior to resolve
    mockSetPanelBehavior.mockReturnValue({
      catch: jest.fn((callback) => {
        // Don't call the callback immediately, let the test trigger it
        return { catch: callback };
      }),
    });

    // Create new manager instance
    manager = new ServiceWorkerManager();
  });

  describe('Service initialization', () => {
    it('should initialize services successfully', async () => {
      await manager.initialize();

      // Verify service container was created
      expect(getDefaultServiceContainer).toHaveBeenCalled();

      // Verify router was created with container
      expect(Router).toHaveBeenCalledWith(mockContainer);

      // Verify transport was created
      expect(Transport).toHaveBeenCalled();

      // Verify message listener was registered
      expect(mockTransport.onMessage).toHaveBeenCalled();

      // Verify getters return initialized values
      expect(manager.getRouter()).toBe(mockRouter);
      expect(manager.getTransport()).toBe(mockTransport);
      expect(manager.getContainer()).toBe(mockContainer);
      expect(manager.isInitialized()).toBe(true);

      // Verify logging
      expect(chromeLogger.info).toHaveBeenCalledWith('Services initialized', {
        handlerCount: 5,
        scheduling: true,
      });
    });

    it('should prevent duplicate initialization', async () => {
      await manager.initialize();

      const initialCallCount = (getDefaultServiceContainer as jest.Mock).mock.calls.length;

      // Try to initialize again
      await manager.initialize();

      // Should not create new instances
      expect(getDefaultServiceContainer).toHaveBeenCalledTimes(initialCallCount);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Services already initialized'));
    });

    it('should handle initialization failure', async () => {
      const testError = new Error('Initialization failed');
      (getDefaultServiceContainer as jest.Mock).mockRejectedValue(testError);

      // Initialize should throw error
      await expect(manager.initialize()).rejects.toThrow('Initialization failed');

      // Verify error was logged
      expect(chromeLogger.error).toHaveBeenCalledWith('Failed to initialize services', {
        error: testError,
      });

      // Manager should not be initialized
      expect(manager.isInitialized()).toBe(false);
      expect(manager.getRouter()).toBeUndefined();
      expect(manager.getTransport()).toBeUndefined();
      expect(manager.getContainer()).toBeUndefined();
    });

    it('should handle concurrent initialization requests', async () => {
      // Start multiple initialization requests
      const promise1 = manager.initialize();
      const promise2 = manager.initialize();
      const promise3 = manager.initialize();

      // All should resolve to the same result
      await Promise.all([promise1, promise2, promise3]);

      // Should only initialize once
      expect(getDefaultServiceContainer).toHaveBeenCalledTimes(1);
      expect(Router).toHaveBeenCalledTimes(1);
      expect(Transport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chrome extension lifecycle', () => {
    let onInstalledCallback: Function;
    let onStartupCallback: Function;
    let _beforeUnloadCallback: Function;

    beforeEach(async () => {
      // Capture the callbacks
      let addListenerCallCount = 0;
      mockAddListener.mockImplementation((callback) => {
        addListenerCallCount++;
        if (addListenerCallCount === 1) {
          onInstalledCallback = callback;
        } else if (addListenerCallCount === 2) {
          onStartupCallback = callback;
        }
      });

      mockSelfAddEventListener.mockImplementation((event, callback) => {
        if (event === 'beforeunload') {
          _beforeUnloadCallback = callback;
        }
      });

      await manager.initialize();
    });

    it('should handle onInstalled event', () => {
      const details = {
        reason: 'install',
        previousVersion: undefined,
      };

      onInstalledCallback(details);

      expect(info).toHaveBeenCalledWith(
        expect.stringContaining('onInstalled'),
        expect.objectContaining({
          reason: 'install',
          previousVersion: undefined,
        })
      );

      expect(chromeLogger.info).toHaveBeenCalledWith('Extension installed', {
        reason: 'install',
        previousVersion: undefined,
      });
    });

    it('should handle onStartup event', () => {
      onStartupCallback();

      expect(info).toHaveBeenCalledWith(expect.stringContaining('onStartup'), expect.any(Object));
      expect(chromeLogger.info).toHaveBeenCalledWith('Extension started');
    });

    it('should handle extension update', () => {
      const details = {
        reason: 'update',
        previousVersion: '1.0.0',
      };

      onInstalledCallback(details);

      expect(chromeLogger.info).toHaveBeenCalledWith('Extension installed', {
        reason: 'update',
        previousVersion: '1.0.0',
      });
    });
  });

  describe('Side panel configuration', () => {
    it('should configure side panel behavior', async () => {
      await manager.initialize();

      expect(mockSetPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: true,
      });
    });

    it('should handle side panel configuration error', async () => {
      const testError = new Error('Panel config failed');

      mockSetPanelBehavior.mockReturnValue({
        catch: jest.fn((callback) => {
          // Immediately call the error handler
          callback(testError);
        }),
      });

      await manager.initialize();

      expect(chromeLogger.error).toHaveBeenCalledWith('Failed to set panel behavior', {
        error: testError,
      });
    });
  });

  describe('Message handling', () => {
    it('should route messages through Router', async () => {
      await manager.initialize();

      // Get the message handler
      const messageHandler = mockTransport.onMessage.mock.calls[0][0];

      const testMessage = { type: 'TEST_ACTION', payload: { data: 'test' } };
      const testSender = { tab: { id: 123 } } as chrome.runtime.MessageSender;

      // Call the message handler
      void messageHandler(testMessage, testSender);

      // Verify router received the message
      expect(mockRouter.handleMessage).toHaveBeenCalledWith(testMessage, testSender);
    });
  });

  describe('Token capture via webRequest', () => {
    let webRequestCallback: Function;

    beforeEach(async () => {
      mockWebRequestAddListener.mockImplementation((callback) => {
        webRequestCallback = callback;
      });

      await manager.initialize();
    });

    it('should capture Bearer tokens from web requests', async () => {
      mockTokenManager.save.mockResolvedValue(true);

      const details = {
        url: 'https://app.navan.com/api/expenses',
        method: 'GET',
        requestHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer test-token-12345' },
        ],
      };

      webRequestCallback(details);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockTokenManager.save).toHaveBeenCalledWith(
        'Bearer test-token-12345',
        'webRequest (https://app.navan.com/api/expenses)'
      );

      expect(mockNotificationsCreate).toHaveBeenCalledWith({
        type: 'basic',
        iconUrl: 'expensabl-icon.png',
        title: 'Authentication Captured',
        message: 'Navan authentication token captured successfully',
      });
    });

    it('should handle TripActions token format', async () => {
      mockTokenManager.save.mockResolvedValue(true);

      const details = {
        url: 'https://app.navan.com/api/data',
        method: 'POST',
        requestHeaders: [{ name: 'authorization', value: 'TripActions auth-token-xyz' }],
      };

      webRequestCallback(details);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockTokenManager.save).toHaveBeenCalledWith(
        'TripActions auth-token-xyz',
        'webRequest (https://app.navan.com/api/data)'
      );
    });

    it('should ignore non-authorization headers', () => {
      const details = {
        url: 'https://app.navan.com/api/test',
        method: 'GET',
        requestHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'X-Custom-Header', value: 'some-value' },
        ],
      };

      webRequestCallback(details);

      expect(mockTokenManager.save).not.toHaveBeenCalled();
    });

    it('should handle token save failure', async () => {
      mockTokenManager.save.mockResolvedValue(false);

      const details = {
        url: 'https://app.navan.com/api/expenses',
        method: 'GET',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer invalid-token' }],
      };

      webRequestCallback(details);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(chromeLogger.warn).toHaveBeenCalledWith('WebRequest: Token validation failed', {
        reason: 'Token format not accepted by validator',
        prefix: 'Bearer invalid-token'.substring(0, 20),
      });

      expect(mockNotificationsCreate).not.toHaveBeenCalled();
    });

    it('should handle missing value in authorization header', () => {
      const details = {
        url: 'https://app.navan.com/api/test',
        method: 'GET',
        requestHeaders: [{ name: 'Authorization', value: undefined }],
      };

      webRequestCallback(details);

      expect(mockTokenManager.save).not.toHaveBeenCalled();
    });

    it('should only listen to Navan URLs', () => {
      expect(mockWebRequestAddListener).toHaveBeenCalledWith(
        expect.any(Function),
        { urls: ['https://app.navan.com/*'] },
        ['requestHeaders']
      );
    });

    it('should handle token capture error gracefully', async () => {
      const captureError = new Error('Save failed');
      mockTokenManager.save.mockRejectedValue(captureError);

      const details = {
        url: 'https://app.navan.com/api/test',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer test-token' }],
      };

      webRequestCallback(details);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(chromeLogger.error).toHaveBeenCalledWith('WebRequest: Failed to save token', {
        error: captureError,
      });

      expect(mockNotificationsCreate).not.toHaveBeenCalled();
    });
  });

  describe('Service worker cleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should cleanup service container on unload', () => {
      // Since self.addEventListener is conditionally called in the service worker,
      // and the condition checks for self !== 'undefined',
      // we'll test the cleanup directly

      // Get the beforeunload callback if it was registered
      const beforeUnloadCall = mockSelfAddEventListener.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      );

      if (beforeUnloadCall) {
        // If the listener was registered, test it
        const callback = beforeUnloadCall[1];
        callback();
      } else {
        // If not registered (due to environment), test cleanup directly
        manager.cleanup();
      }

      expect(mockContainer.cleanup).toHaveBeenCalled();
      expect(chromeLogger.info).toHaveBeenCalledWith('Service container cleanup completed');

      // Verify manager state is reset
      expect(manager.isInitialized()).toBe(false);
      expect(manager.getRouter()).toBeUndefined();
      expect(manager.getTransport()).toBeUndefined();
      expect(manager.getContainer()).toBeUndefined();
    });

    it('should handle cleanup errors gracefully', () => {
      const cleanupError = new Error('Cleanup failed');
      mockContainer.cleanup.mockImplementation(() => {
        throw cleanupError;
      });

      // Get the beforeunload callback if it was registered
      const beforeUnloadCall = mockSelfAddEventListener.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      );

      if (beforeUnloadCall) {
        // If the listener was registered, test it
        const callback = beforeUnloadCall[1];
        callback();
      } else {
        // If not registered (due to environment), test cleanup directly
        manager.cleanup();
      }

      expect(chromeLogger.error).toHaveBeenCalledWith('Error during service worker cleanup', {
        error: cleanupError,
      });
    });

    it('should handle manual cleanup', async () => {
      manager.cleanup();

      expect(mockContainer.cleanup).toHaveBeenCalled();
      expect(manager.isInitialized()).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing webRequest API', async () => {
      // Remove webRequest API
      delete (global as any).chrome.webRequest;

      await manager.initialize();

      expect(chromeLogger.warn).toHaveBeenCalledWith('WebRequest API not available');
      expect(mockWebRequestAddListener).not.toHaveBeenCalled();

      // Restore for other tests
      (global as any).chrome.webRequest = {
        onBeforeSendHeaders: { addListener: mockWebRequestAddListener },
      };
    });

    it('should handle concurrent message processing', async () => {
      await manager.initialize();

      const messageHandler = mockTransport.onMessage.mock.calls[0][0];

      // Send multiple messages concurrently
      const messages = [
        { type: 'ACTION_1', payload: { id: 1 } },
        { type: 'ACTION_2', payload: { id: 2 } },
        { type: 'ACTION_3', payload: { id: 3 } },
      ];

      const promises = messages.map((msg) =>
        Promise.resolve(messageHandler(msg, { tab: { id: 1 } } as chrome.runtime.MessageSender))
      );

      await Promise.all(promises);

      // All messages should be handled
      expect(mockRouter.handleMessage).toHaveBeenCalledTimes(3);
      messages.forEach((msg) => {
        expect(mockRouter.handleMessage).toHaveBeenCalledWith(msg, expect.any(Object));
      });
    });

    it('should register webRequest listener again after cleanup', async () => {
      await manager.initialize();

      const initialCallCount = mockWebRequestAddListener.mock.calls.length;
      expect(initialCallCount).toBe(1);

      // Force cleanup to reset the listener flag
      manager.cleanup();

      // Clear the mock to better track the second initialization
      mockWebRequestAddListener.mockClear();

      // Re-initialize after cleanup
      await manager.initialize();

      // Should register listener again after cleanup
      expect(mockWebRequestAddListener).toHaveBeenCalledTimes(1);
    });
  });
});
