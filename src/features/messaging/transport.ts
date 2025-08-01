import { MessageResponse } from './types';
import { chromeLogger as logger, info } from '../../shared/services/logger/chrome-logger-setup';

export interface IMessageTransport {
  onMessage(
    handler: (message: unknown, sender: chrome.runtime.MessageSender) => Promise<MessageResponse>
  ): () => void;

  sendMessage<T>(message: T, options?: MessageOptions): Promise<MessageResponse>;
}

export interface MessageOptions {
  tabId?: number;
  frameId?: number;
  timeout?: number;
}

export class Transport implements IMessageTransport {
  onMessage(
    handler: (message: unknown, sender: chrome.runtime.MessageSender) => Promise<MessageResponse>
  ): () => void {
    const chromeHandler = (
      request: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean => {
      // Log message receipt for debugging
      info('[TRANSPORT] Message received', {
        action: (request as any)?.action,
        requestId: (request as any)?.requestId,
        timestamp: Date.now(),
        sender: sender.tab?.id || 'extension',
      });

      handler(request, sender)
        .then(sendResponse)
        .catch((error) => {
          logger.error('Message handler error', { error });
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });

      return true; // Indicates async response
    };

    chrome.runtime.onMessage.addListener(chromeHandler);

    return () => {
      chrome.runtime.onMessage.removeListener(chromeHandler);
    };
  }

  async sendMessage<T>(message: T, options: MessageOptions = {}): Promise<MessageResponse> {
    try {
      if (options.tabId) {
        return await chrome.tabs.sendMessage(options.tabId, message);
      }
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }
}
