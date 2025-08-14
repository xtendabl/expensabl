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

  // Lifecycle tracking
  private lifecycleStats = {
    startTime: Date.now(),
    initializationAttempts: 0,
    successfulInitializations: 0,
    failedInitializations: 0,
    restartCount: 0,
    lastRestartTime: 0,
    chromeApiCalls: {
      storage: 0,
      alarms: 0,
      notifications: 0,
      webRequest: 0,
    },
    backgroundTasks: {
      templateScheduling: 0,
      tokenCapture: 0,
      cleanup: 0,
    },
  };

  async initialize(): Promise<void> {
    const initStart = performance.now();
    const initId = `sw_init_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    this.lifecycleStats.initializationAttempts++;

    // Detect service worker restart
    const timeSinceStart = Date.now() - this.lifecycleStats.startTime;
    const isRestart = this.lifecycleStats.initializationAttempts > 1 || timeSinceStart < 5000;

    if (isRestart) {
      this.lifecycleStats.restartCount++;
      this.lifecycleStats.lastRestartTime = Date.now();
    }

    info('SERVICE_WORKER_LIFECYCLE: Initialization initiated', {
      initId,
      lifecycle: {
        isRestart,
        restartCount: this.lifecycleStats.restartCount,
        timeSinceStart,
        initializationAttempts: this.lifecycleStats.initializationAttempts,
        alreadyInitialized: this.initialized,
        hasInitPromise: !!this.initializationPromise,
      },
      timestamp: Date.now(),
    });

    if (this.initialized) {
      const totalTime = Math.round(performance.now() - initStart);
      warn('SERVICE_WORKER_LIFECYCLE: Already initialized, skipping', {
        initId,
        timing: { total: totalTime },
        lifecycle: this.lifecycleStats,
      });
      return this.initializationPromise!;
    }

    if (this.initializationPromise) {
      info('SERVICE_WORKER_LIFECYCLE: Initialization in progress, waiting', {
        initId,
        concurrentInitAttempt: true,
      });
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(initId, initStart);
    return this.initializationPromise;
  }

  private async performInitialization(initId: string, initStart: number): Promise<void> {
    try {
      // Get service container with timing
      const containerStart = performance.now();
      this.container = await getDefaultServiceContainer();
      const containerTime = Math.round(performance.now() - containerStart);

      info('SERVICE_WORKER_LIFECYCLE: Service container initialized', {
        initId,
        timing: { containerInit: containerTime },
        containerType: this.container.constructor.name,
      });

      // Create router with dependencies
      const routerStart = performance.now();
      this.router = new Router(this.container);
      const routerTime = Math.round(performance.now() - routerStart);

      info('SERVICE_WORKER_LIFECYCLE: Router initialized', {
        initId,
        timing: { routerInit: routerTime },
        handlerCount: this.router.getHandlerCount(),
      });

      // Create transport
      const transportStart = performance.now();
      this.transport = new Transport();
      const transportTime = Math.round(performance.now() - transportStart);

      // Register message listener
      this.unsubscribe = this.transport.onMessage((message, sender) =>
        this.router!.handleMessage(message, sender)
      );

      info('SERVICE_WORKER_LIFECYCLE: Transport initialized', {
        initId,
        timing: { transportInit: transportTime },
        hasMessageListener: !!this.unsubscribe,
      });

      // Set up Chrome event listeners
      const listenersStart = performance.now();
      this.setupChromeListeners();
      const listenersTime = Math.round(performance.now() - listenersStart);

      // Set up token capture
      const tokenCaptureStart = performance.now();
      this.setupTokenCapture();
      const tokenCaptureTime = Math.round(performance.now() - tokenCaptureStart);

      this.initialized = true;
      this.lifecycleStats.successfulInitializations++;

      const totalTime = Math.round(performance.now() - initStart);

      info('SERVICE_WORKER_LIFECYCLE: Initialization completed successfully', {
        initId,
        success: true,
        timing: {
          total: totalTime,
          container: containerTime,
          router: routerTime,
          transport: transportTime,
          listeners: listenersTime,
          tokenCapture: tokenCaptureTime,
          breakdown: {
            container_pct: Math.round((containerTime / totalTime) * 100),
            router_pct: Math.round((routerTime / totalTime) * 100),
            transport_pct: Math.round((transportTime / totalTime) * 100),
            listeners_pct: Math.round((listenersTime / totalTime) * 100),
            tokenCapture_pct: Math.round((tokenCaptureTime / totalTime) * 100),
          },
        },
        components: {
          handlerCount: this.router.getHandlerCount(),
          hasMessageListener: !!this.unsubscribe,
          webRequestListenerAdded: this.webRequestListenerAdded,
        },
        lifecycle: this.lifecycleStats,
      });

      // Log periodic stats (every 10 successful initializations)
      if (this.lifecycleStats.successfulInitializations % 10 === 0) {
        this.logPeriodicStats();
      }
    } catch (error) {
      this.initialized = false;
      this.initializationPromise = null;
      this.lifecycleStats.failedInitializations++;

      const errorTime = Math.round(performance.now() - initStart);

      logger.error('SERVICE_WORKER_LIFECYCLE: Initialization failed', {
        initId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        lifecycle: this.lifecycleStats,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  private setupChromeListeners(): void {
    // Extension lifecycle events with comprehensive logging
    chrome.runtime.onInstalled.addListener((details) => {
      const installEvent = {
        reason: details.reason,
        previousVersion: details.previousVersion,
        timestamp: Date.now(),
        isUpdate: details.reason === 'update',
        isInstall: details.reason === 'install',
      };

      info('SERVICE_WORKER_LIFECYCLE: Extension installed/updated', {
        event: 'onInstalled',
        details: installEvent,
        lifecycle: this.lifecycleStats,
      });

      logger.info('Extension installed', installEvent);
    });

    chrome.runtime.onStartup.addListener(() => {
      const startupEvent = {
        timestamp: Date.now(),
        timeSinceInit: Date.now() - this.lifecycleStats.startTime,
      };

      info('SERVICE_WORKER_LIFECYCLE: Extension startup', {
        event: 'onStartup',
        details: startupEvent,
        lifecycle: this.lifecycleStats,
      });

      logger.info('Extension started', startupEvent);
    });

    // Handle side panel opening with Chrome API timing
    const sidePanelStart = performance.now();

    // Ensure setPanelBehavior returns a Promise (for test compatibility)
    const setPanelBehaviorResult = chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    });
    const panelPromise =
      setPanelBehaviorResult != null && typeof setPanelBehaviorResult.then === 'function'
        ? setPanelBehaviorResult
        : Promise.resolve();

    panelPromise
      .then(() => {
        const sidePanelTime = Math.round(performance.now() - sidePanelStart);
        info('SERVICE_WORKER_LIFECYCLE: Side panel behavior set', {
          chromeApi: 'sidePanel.setPanelBehavior',
          timing: { apiCall: sidePanelTime },
          success: true,
        });
      })
      .catch((error) => {
        const sidePanelTime = Math.round(performance.now() - sidePanelStart);
        logger.error('SERVICE_WORKER_LIFECYCLE: Failed to set panel behavior', {
          chromeApi: 'sidePanel.setPanelBehavior',
          timing: { apiCall: sidePanelTime },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    // Log when service worker is about to be terminated
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('beforeunload', () => {
        const uptime = Date.now() - this.lifecycleStats.startTime;
        logger.info('SERVICE_WORKER_LIFECYCLE: Service worker unloading', {
          event: 'beforeunload',
          uptime,
          lifecycle: this.lifecycleStats,
          components: {
            initialized: this.initialized,
            hasRouter: !!this.router,
            hasTransport: !!this.transport,
            hasContainer: !!this.container,
          },
        });
        this.cleanup();
      });
    }

    // Add suspend/resume detection if available
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('suspend', () => {
        logger.info('SERVICE_WORKER_LIFECYCLE: Service worker suspended', {
          event: 'suspend',
          uptime: Date.now() - this.lifecycleStats.startTime,
          lifecycle: this.lifecycleStats,
        });
      });

      self.addEventListener('resume', () => {
        logger.info('SERVICE_WORKER_LIFECYCLE: Service worker resumed', {
          event: 'resume',
          uptime: Date.now() - this.lifecycleStats.startTime,
          lifecycle: this.lifecycleStats,
        });
      });
    }
  }

  private setupTokenCapture(): void {
    // Token capture via webRequest
    if (chrome.webRequest && !this.webRequestListenerAdded) {
      // Track token capture statistics
      const captureStats = {
        totalRequests: 0,
        authHeadersFound: 0,
        tokensAttempted: 0,
        tokensSuccessful: 0,
        lastCaptureTime: 0,
      };

      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          captureStats.totalRequests++;
          const requestId = `webreq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          logger.debug('TOKEN_CAPTURE: WebRequest intercepted', {
            requestId,
            url: details.url,
            method: details.method,
            timestamp: Date.now(),
            stats: {
              totalRequests: captureStats.totalRequests,
              successRate:
                captureStats.totalRequests > 0
                  ? `${((captureStats.tokensSuccessful / captureStats.totalRequests) * 100).toFixed(
                      2
                    )}%`
                  : '0%',
            },
          });

          if (details.requestHeaders) {
            for (const header of details.requestHeaders) {
              if (header.name.toLowerCase() === 'authorization' && header.value) {
                captureStats.authHeadersFound++;

                // Comprehensive token analysis
                const tokenAnalysis = {
                  length: header.value.length,
                  preview: `${header.value.substring(0, 20)}...`,
                  fullPrefix: header.value.substring(0, 30),
                  structure: {
                    startsWithBearer: header.value.startsWith('Bearer'),
                    startsWithTripActions: header.value.startsWith('TripActions'),
                    containsSpaces: header.value.includes(' '),
                    containsDashes: header.value.includes('-'),
                    containsUnderscores: header.value.includes('_'),
                    containsDots: header.value.includes('.'),
                  },
                  sourceUrl: details.url,
                  method: details.method,
                };

                logger.info('TOKEN_CAPTURE: Authorization header found', {
                  requestId,
                  tokenAnalysis,
                  captureAttempt: captureStats.authHeadersFound,
                  url: details.url,
                  timestamp: Date.now(),
                });

                // Try to save any format - let the validator decide
                // Use void to handle async operation without blocking
                void (async () => {
                  const saveStart = performance.now();
                  captureStats.tokensAttempted++;

                  try {
                    // Get auth manager from service container
                    const authManager = this.container!.tokenManager;

                    const saved = await authManager.save(
                      header.value!, // We already checked it exists above
                      `webRequest (${details.url})`
                    );

                    const saveTime = Math.round(performance.now() - saveStart);

                    if (saved) {
                      captureStats.tokensSuccessful++;
                      captureStats.lastCaptureTime = Date.now();

                      logger.info('TOKEN_CAPTURE: Token captured successfully', {
                        requestId,
                        success: true,
                        tokenAnalysis,
                        timing: { saveTime },
                        stats: {
                          totalAttempts: captureStats.tokensAttempted,
                          successfulCaptures: captureStats.tokensSuccessful,
                          successRate: `${(
                            (captureStats.tokensSuccessful / captureStats.tokensAttempted) *
                            100
                          ).toFixed(2)}%`,
                          lastCaptureTime: captureStats.lastCaptureTime,
                        },
                      });
                    } else {
                      logger.warn('TOKEN_CAPTURE: Token validation failed', {
                        requestId,
                        success: false,
                        reason: 'Token format not accepted by validator',
                        tokenAnalysis,
                        timing: { saveTime },
                        stats: {
                          totalAttempts: captureStats.tokensAttempted,
                          successfulCaptures: captureStats.tokensSuccessful,
                          failureRate: `${(
                            ((captureStats.tokensAttempted - captureStats.tokensSuccessful) /
                              captureStats.tokensAttempted) *
                            100
                          ).toFixed(2)}%`,
                        },
                      });
                    }
                  } catch (error) {
                    const errorTime = Math.round(performance.now() - saveStart);
                    logger.error('TOKEN_CAPTURE: Token save failed', {
                      requestId,
                      success: false,
                      error: error instanceof Error ? error.message : 'Unknown error',
                      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
                      tokenAnalysis,
                      timing: { saveTime: errorTime },
                    });
                  }
                })();
              }
            }
          }

          // Periodic stats logging (every 100 requests)
          if (captureStats.totalRequests % 100 === 0) {
            logger.info('TOKEN_CAPTURE: Periodic statistics', {
              stats: captureStats,
              performance: {
                authHeaderRate: `${(
                  (captureStats.authHeadersFound / captureStats.totalRequests) *
                  100
                ).toFixed(2)}%`,
                captureSuccessRate:
                  captureStats.tokensAttempted > 0
                    ? `${(
                        (captureStats.tokensSuccessful / captureStats.tokensAttempted) *
                        100
                      ).toFixed(2)}%`
                    : '0%',
                timeSinceLastCapture: captureStats.lastCaptureTime
                  ? Date.now() - captureStats.lastCaptureTime
                  : null,
              },
            });
          }
        },
        { urls: ['https://app.navan.com/*'] },
        ['requestHeaders']
      );

      this.webRequestListenerAdded = true;
      logger.info('TOKEN_CAPTURE: WebRequest listener registered', {
        targetUrls: ['https://app.navan.com/*'],
        listenerType: 'onBeforeSendHeaders',
        permissions: ['requestHeaders'],
        timestamp: Date.now(),
      });
    } else if (!chrome.webRequest) {
      logger.warn('TOKEN_CAPTURE: WebRequest API not available', {
        reason: 'chrome.webRequest is undefined',
        permissions: 'Check manifest.json for webRequest permission',
      });
    }
  }

  cleanup(): void {
    const cleanupStart = performance.now();
    const cleanupId = `sw_cleanup_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    info('SERVICE_WORKER_LIFECYCLE: Cleanup initiated', {
      cleanupId,
      uptime: Date.now() - this.lifecycleStats.startTime,
      lifecycle: this.lifecycleStats,
      components: {
        hasContainer: !!this.container,
        hasRouter: !!this.router,
        hasTransport: !!this.transport,
        hasUnsubscribe: !!this.unsubscribe,
      },
    });

    try {
      // Cleanup the service container and all its resources
      if (this.container) {
        const containerCleanupStart = performance.now();
        this.container.cleanup();
        const containerCleanupTime = Math.round(performance.now() - containerCleanupStart);

        info('SERVICE_WORKER_LIFECYCLE: Service container cleaned up', {
          cleanupId,
          timing: { containerCleanup: containerCleanupTime },
        });
      }

      // Unsubscribe from message listener
      if (this.unsubscribe) {
        const unsubscribeStart = performance.now();
        this.unsubscribe();
        const unsubscribeTime = Math.round(performance.now() - unsubscribeStart);

        info('SERVICE_WORKER_LIFECYCLE: Message listener unsubscribed', {
          cleanupId,
          timing: { unsubscribe: unsubscribeTime },
        });
      }

      // Reset state
      this.initialized = false;
      this.initializationPromise = null;
      this.router = undefined;
      this.transport = undefined;
      this.container = undefined;
      this.unsubscribe = undefined;
      this.webRequestListenerAdded = false;

      const totalCleanupTime = Math.round(performance.now() - cleanupStart);

      info('SERVICE_WORKER_LIFECYCLE: Cleanup completed successfully', {
        cleanupId,
        success: true,
        timing: { total: totalCleanupTime },
        finalLifecycle: this.lifecycleStats,
      });
    } catch (error) {
      const errorTime = Math.round(performance.now() - cleanupStart);

      logger.error('SERVICE_WORKER_LIFECYCLE: Cleanup failed', {
        cleanupId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        lifecycle: this.lifecycleStats,
      });
    }
  }

  /**
   * Log periodic statistics about service worker performance
   */
  private logPeriodicStats(): void {
    const uptime = Date.now() - this.lifecycleStats.startTime;
    const routerStats = this.router?.getProcessingStats();

    info('SERVICE_WORKER_LIFECYCLE: Periodic statistics', {
      uptime: {
        milliseconds: uptime,
        minutes: Math.round(uptime / 1000 / 60),
        hours: Math.round(uptime / 1000 / 60 / 60),
      },
      lifecycle: this.lifecycleStats,
      messageRouting: routerStats,
      performance: {
        initSuccessRate:
          this.lifecycleStats.initializationAttempts > 0
            ? `${(
                (this.lifecycleStats.successfulInitializations /
                  this.lifecycleStats.initializationAttempts) *
                100
              ).toFixed(2)}%`
            : '0%',
        restartFrequency:
          this.lifecycleStats.restartCount > 0
            ? `${Math.round(
                uptime / this.lifecycleStats.restartCount / 1000 / 60
              )} minutes between restarts`
            : 'No restarts',
        memoryUsage: this.getMemoryUsage(),
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Get memory usage information if available
   */
  private getMemoryUsage(): Record<string, unknown> {
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (
          performance as unknown as {
            memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
          }
        ).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        };
      }
    } catch {
      // Memory API not available or failed
    }
    return { available: false };
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

// Handle messages immediately, even before full initialization
// This prevents race conditions where the sidepanel sends messages before the service worker is ready
// Only add listener in real Chrome environment, not in tests
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Check if service worker is initialized
    if (!serviceWorkerManager.isInitialized()) {
      info('[SERVICE_WORKER] Message received before initialization, waiting for init', {
        action: (message as Record<string, unknown>)?.action,
      });

      // Wait for initialization then handle the message
      serviceWorkerManager
        .initialize()
        .then(() => {
          // Message will be handled by the registered transport listener
          info('[SERVICE_WORKER] Initialization complete, message will be processed by transport');
        })
        .catch((err) => {
          error('[SERVICE_WORKER] Failed to initialize while handling message', { error: err });
          sendResponse({
            success: false,
            error: 'Service worker initialization failed. Please reload the extension.',
          });
        });

      // Return true to indicate async response
      return true;
    }

    // If initialized, let the transport handle it normally
    return false;
  });
}
