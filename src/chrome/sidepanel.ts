import { error as logError, info, warn } from '../shared/services/logger/chrome-logger-setup';
import { MessageAdapter, UIMessage } from './message-adapter';
import { SidepanelUI } from './sidepanel-ui';

/**
 * Sidepanel entry point that integrates with the existing HTML UI
 * Uses MessageAdapter to bridge between UI messages and our typed backend
 */

// Send message to background script with adapter
async function sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Log all messages being sent
  info('SIDEPANEL_SEND_MESSAGE', {
    action: message.action,
    requestId: message.requestId,
    timestamp: Date.now(),
  });

  try {
    // Transform UI message to backend format
    const backgroundMessage = MessageAdapter.transformRequest(message as unknown as UIMessage);

    if (!backgroundMessage) {
      throw new Error(`Unknown action: ${message.action}`);
    }

    // Send to background script
    const response = await chrome.runtime.sendMessage(backgroundMessage);

    // Transform response back to UI format
    return MessageAdapter.transformResponse((message as unknown as UIMessage).action, response);
  } catch (error) {
    logError('Failed to send message:', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Make sendMessage available to the existing UI code
(window as Window & { sendMessage?: typeof sendMessage }).sendMessage = sendMessage;

// Track if already initialized
let isInitialized = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) {
    warn('Sidepanel already initialized! Skipping duplicate initialization.');
    return;
  }

  isInitialized = true;
  info('Sidepanel initialized with message adapter');

  // Initialize the UI handler
  const ui = new SidepanelUI(sendMessage);
  ui.initialize();

  // Make UI instance available globally for debugging
  (window as Window & { sidepanelUI?: SidepanelUI }).sidepanelUI = ui;
});
