import { Transport } from '../transport';
import { MessageResponse } from '../types';

// Mock the logger
jest.mock('../../../shared/services/logger/chrome-logger-setup', () => ({
  chromeLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock Chrome API
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  tabs: {
    sendMessage: jest.fn(),
  },
};

// Replace global chrome with mock
(global as any).chrome = mockChrome;

// Import the mocked logger
import { chromeLogger as logger } from '../../../shared/services/logger/chrome-logger-setup';

describe('Transport', () => {
  let transport: Transport;

  beforeEach(() => {
    transport = new Transport();
    jest.clearAllMocks();
    (logger.error as jest.Mock).mockClear();
  });

  describe('onMessage', () => {
    it('should register a message listener', () => {
      const handler = jest.fn();

      const unsubscribe = transport.onMessage(handler);

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledWith(expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle incoming messages', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true, data: 'test' });
      const message = { action: 'TEST' };
      const sender = { id: 'sender-id' };
      const sendResponse = jest.fn();

      transport.onMessage(handler);

      // Get the registered Chrome handler
      const chromeHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Simulate Chrome calling the handler
      const shouldWaitForAsync = chromeHandler(message, sender, sendResponse);

      // Should return true to indicate async response
      expect(shouldWaitForAsync).toBe(true);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(handler).toHaveBeenCalledWith(message, sender);
      expect(sendResponse).toHaveBeenCalledWith({ success: true, data: 'test' });
    });

    it('should handle handler errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const sendResponse = jest.fn();

      transport.onMessage(handler);

      const chromeHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      chromeHandler({}, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Handler failed',
      });
      expect(logger.error).toHaveBeenCalledWith('Message handler error', {
        error: expect.any(Error),
      });
    });

    it('should handle non-Error exceptions', async () => {
      const handler = jest.fn().mockRejectedValue('String error');
      const sendResponse = jest.fn();

      transport.onMessage(handler);

      const chromeHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      chromeHandler({}, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown error',
      });

      expect(logger.error).toHaveBeenCalledWith('Message handler error', { error: 'String error' });
    });

    it('should properly unsubscribe', () => {
      const handler = jest.fn();

      const unsubscribe = transport.onMessage(handler);

      // Get the registered handler reference
      const chromeHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

      // Unsubscribe
      unsubscribe();

      expect(mockChrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(chromeHandler);
    });
  });

  describe('sendMessage', () => {
    it('should send message via runtime API', async () => {
      const message = { action: 'TEST' };
      const expectedResponse: MessageResponse = { success: true, data: 'response' };
      mockChrome.runtime.sendMessage.mockResolvedValue(expectedResponse);

      const response = await transport.sendMessage(message);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
      expect(response).toEqual(expectedResponse);
    });

    it('should send message to specific tab', async () => {
      const message = { action: 'TEST' };
      const tabId = 123;
      const expectedResponse: MessageResponse = { success: true, data: 'tab-response' };
      mockChrome.tabs.sendMessage.mockResolvedValue(expectedResponse);

      const response = await transport.sendMessage(message, { tabId });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(response).toEqual(expectedResponse);
    });

    it('should handle send errors', async () => {
      const message = { action: 'TEST' };
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Send failed'));

      const response = await transport.sendMessage(message);

      expect(response).toEqual({
        success: false,
        error: 'Send failed',
      });
    });

    it('should handle non-Error send failures', async () => {
      const message = { action: 'TEST' };
      mockChrome.runtime.sendMessage.mockRejectedValue('Connection error');

      const response = await transport.sendMessage(message);

      expect(response).toEqual({
        success: false,
        error: 'Failed to send message',
      });
    });

    it('should handle tab send errors', async () => {
      const message = { action: 'TEST' };
      const tabId = 123;
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Tab not found'));

      const response = await transport.sendMessage(message, { tabId });

      expect(response).toEqual({
        success: false,
        error: 'Tab not found',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsubscribe1 = transport.onMessage(handler1);
      const unsubscribe2 = transport.onMessage(handler2);

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(2);

      unsubscribe1();
      unsubscribe2();

      expect(mockChrome.runtime.onMessage.removeListener).toHaveBeenCalledTimes(2);
    });

    it('should handle synchronous handler responses', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true, data: 'sync' });
      const sendResponse = jest.fn();

      transport.onMessage(handler);

      const chromeHandler = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      chromeHandler({}, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sendResponse).toHaveBeenCalledWith({ success: true, data: 'sync' });
    });
  });
});
