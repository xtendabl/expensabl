import { Router } from '../features/messaging/router';
import {
  getDefaultServiceContainer,
  type IServiceContainer,
} from '../features/messaging/service-container';
import { Transport } from '../features/messaging/transport';
import {
  chromeLogger,
  chromeLogger as logger,
  error,
  info,
  warn,
} from '../shared/services/logger/chrome-logger-setup';

/**
 * Chrome Extension Service Worker
 * Handles background message processing and extension lifecycle
 */

export class ServiceWorkerManager {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private router?: Router;
  private transport?: Transport;
  private container?: IServiceContainer;
  private unsubscribe?: () => void;
  private webRequestListenerAdded = false;

  async initialize(): Promise<void> {
    info('[SERVICE_WORKER] initialize called', {
      alreadyInitialized: this.initialized,
      timestamp: Date.now(),
    });

    if (this.initialized) {
      warn('[SERVICE_WORKER] Services already initialized, skipping');
      return this.initializationPromise!;
    }

    if (this.initializationPromise) {
      info('[SERVICE_WORKER] Initialization already in progress, waiting');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Get service container
      this.container = await getDefaultServiceContainer();

      // Create router with dependencies
      this.router = new Router(this.container);

      // Create transport
      this.transport = new Transport();

      // Register message listener
      this.unsubscribe = this.transport.onMessage((message, sender) =>
        this.router!.handleMessage(message, sender)
      );

      // Set up Chrome event listeners
      this.setupChromeListeners();

      // Set up token capture
      this.setupTokenCapture();

      this.initialized = true;

      info('[SERVICE_WORKER] Services initialized successfully');
      logger.info('Services initialized', {
        handlerCount: this.router.getHandlerCount(),
        scheduling: true,
      });
    } catch (error) {
      this.initialized = false;
      this.initializationPromise = null;
      logger.error('Failed to initialize services', { error });
      throw error;
    }
  }

  private setupChromeListeners(): void {
    // Extension lifecycle events
    chrome.runtime.onInstalled.addListener((details) => {
      info('[SERVICE_WORKER] onInstalled', {
        reason: details.reason,
        previousVersion: details.previousVersion,
        timestamp: Date.now(),
      });

      logger.info('Extension installed', {
        reason: details.reason,
        previousVersion: details.previousVersion,
      });
    });

    chrome.runtime.onStartup.addListener(() => {
      info('[SERVICE_WORKER] onStartup', { timestamp: Date.now() });
      logger.info('Extension started');
    });

    // Handle side panel opening
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => logger.error('Failed to set panel behavior', { error }));

    // Log when service worker is about to be terminated
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('beforeunload', () => {
        logger.info('Service worker unloading - starting cleanup');
        this.cleanup();
      });
    }
  }

  private setupTokenCapture(): void {
    // Token capture via webRequest
    if (chrome.webRequest && !this.webRequestListenerAdded) {
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          logger.debug('WebRequest: Checking headers', {
            url: details.url,
            method: details.method,
          });

          if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
              if (header.name.toLowerCase() === 'authorization' && header.value) {
                logger.info('WebRequest: Found authorization header', {
                  headerPreview: `${header.value.substring(0, 20)}...`,
                  url: details.url,
                });

                // Log all authorization headers to understand the format
                logger.info('WebRequest: Authorization header details', {
                  fullPrefix: header.value.substring(0, 30),
                  startsWithBearer: header.value.startsWith('Bearer'),
                  startsWithTripActions: header.value.startsWith('TripActions'),
                  length: header.value.length,
                });

                // Try to save any format - let the validator decide
                // Use void to handle async operation without blocking
                void (async () => {
                  try {
                    // Get auth manager from service container
                    const authManager = this.container!.tokenManager;

                    const saved = await authManager.save(
                      header.value!, // We already checked it exists above
                      `webRequest (${details.url})`
                    );

                    logger.info('WebRequest: Token save attempt', {
                      saved,
                      tokenFormat: header.value!.substring(0, 20),
                    });

                    if (saved) {
                      // Show notification
                      chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'expensabl-icon.png',
                        title: 'Authentication Captured',
                        message: 'Navan authentication token captured successfully',
                      });
                    } else {
                      logger.warn('WebRequest: Token validation failed', {
                        reason: 'Token format not accepted by validator',
                        prefix: header.value!.substring(0, 20),
                      });
                    }
                  } catch (error) {
                    logger.error('WebRequest: Failed to save token', { error });
                  }
                })();
              }
            }
          }
        },
        { urls: ['https://app.navan.com/*'] },
        ['requestHeaders']
      );

      this.webRequestListenerAdded = true;
      logger.info('WebRequest: Token capture listener registered');
    } else if (!chrome.webRequest) {
      logger.warn('WebRequest API not available');
    }
  }

  cleanup(): void {
    try {
      // Cleanup the service container and all its resources
      if (this.container) {
        this.container.cleanup();
        logger.info('Service container cleanup completed');
      }

      // Unsubscribe from message listener
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      this.initialized = false;
      this.initializationPromise = null;
      this.router = undefined;
      this.transport = undefined;
      this.container = undefined;
      this.unsubscribe = undefined;
      this.webRequestListenerAdded = false;
    } catch (error) {
      logger.error('Error during service worker cleanup', { error });
    }
  }

  // Expose methods for testing
  getRouter(): Router | undefined {
    return this.router;
  }

  getTransport(): Transport | undefined {
    return this.transport;
  }

  getContainer(): IServiceContainer | undefined {
    return this.container;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-initialize for production (but can be controlled in tests)
// Check if running in Jest test environment
if (typeof jest === 'undefined' && typeof process === 'undefined') {
  info('[SERVICE_WORKER] Auto-initialization starting');
  chromeLogger.info('Starting service worker auto-initialization');
  serviceWorkerManager.initialize().catch((err) => {
    error('[SERVICE_WORKER] Failed to initialize service worker', { error: err });
    logger.error('Failed to initialize service worker', { error: err });
  });
}
