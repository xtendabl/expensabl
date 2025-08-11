import { error as logError, info, warn } from '../shared/services/logger/chrome-logger-setup';
import { MessageAdapter, UIMessage } from './message-adapter';
import { SidepanelUI } from './sidepanel-ui';
import { testApiParameters } from './test-api-helper';

/**
 * Sidepanel entry point that integrates with the existing HTML UI
 * Uses MessageAdapter to bridge between UI messages and our typed backend
 */

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100, // ms
  maxDelay: 2000, // ms
  backoffFactor: 2,
};

// Send message to background script with adapter and retry logic
async function sendMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Log all messages being sent
  info('SIDEPANEL_SEND_MESSAGE', {
    action: message.action,
    requestId: message.requestId,
    timestamp: Date.now(),
  });

  let lastError: Error | unknown;
  let delay = RETRY_CONFIG.initialDelay;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Transform UI message to backend format
      const backgroundMessage = MessageAdapter.transformRequest(message as unknown as UIMessage);

      if (!backgroundMessage) {
        throw new Error(`Unknown action: ${message.action}`);
      }

      // Send to background script
      const response = await chrome.runtime.sendMessage(backgroundMessage);

      // Check for service initialization errors
      if (!response.success && response.error?.includes('initialization')) {
        throw new Error('SERVICE_NOT_READY');
      }

      // Transform response back to UI format
      return MessageAdapter.transformResponse((message as unknown as UIMessage).action, response);
    } catch (error) {
      lastError = error;

      // Check if this is a connection error or service not ready
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        errorMessage.includes('Could not establish connection') ||
        errorMessage.includes('SERVICE_NOT_READY') ||
        errorMessage.includes('Receiving end does not exist');

      if (isConnectionError && attempt < RETRY_CONFIG.maxRetries) {
        info(
          `SIDEPANEL_RETRY: Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}, waiting ${delay}ms`,
          {
            action: message.action,
            error: errorMessage,
          }
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * RETRY_CONFIG.backoffFactor, RETRY_CONFIG.maxDelay);
        continue;
      }

      // If not a retriable error or max retries reached, break
      break;
    }
  }

  // All retries exhausted or non-retriable error
  logError('Failed to send message after retries:', {
    error: lastError,
    action: message.action,
    retries: RETRY_CONFIG.maxRetries,
  });

  // Provide more specific error messages
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  let userFriendlyError = 'Unknown error';

  if (
    errorMessage.includes('Could not establish connection') ||
    errorMessage.includes('Receiving end does not exist')
  ) {
    userFriendlyError = 'Service temporarily unavailable. Please try again in a moment.';
  } else if (errorMessage.includes('SERVICE_NOT_READY')) {
    userFriendlyError = 'Extension is initializing. Please wait a moment and try again.';
  } else {
    userFriendlyError = errorMessage;
  }

  return {
    success: false,
    error: userFriendlyError,
  };
}

// Make sendMessage available to the existing UI code
window.sendMessage = sendMessage;

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

  // Make test function available in console
  window.testApiParameters = testApiParameters;
  info('💡 API tester ready! Run testApiParameters() in console to test API parameters.');
  ui.initialize();

  // Make UI instance available globally for debugging
  window.sidepanelUI = ui;
});
