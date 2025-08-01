/**
 * Chrome Extension Logger Setup
 *
 * Configures the logger with Chrome extension specific behavior:
 * - Persistent storage via chrome.storage.local
 * - Context detection for different script types
 * - Data sanitization for security
 * - Environment-based default levels
 */

import { ChromeLogger } from './chrome-logger';
import { LogLevel, LogEntry, LogFilter, LoggerUtils } from './types';
import { getLoggerEnvironmentConfig, formatLoggerConfig } from './env-config';

// Configuration
const LOG_LEVEL_STORAGE_KEY = 'logger-level-preference';
const LOG_STORAGE_KEY = 'extension-logs';
const MAX_LOG_ENTRIES = 1000;
const STORAGE_DEBOUNCE_MS = 1000;

// State
let logBuffer: LogEntry[] = [];
let persistTimeout: NodeJS.Timeout | null = null;

/**
 * Detect current script context within Chrome extension
 */
function detectScriptContext(): NonNullable<LogEntry['context']>['scriptType'] {
  // Service worker/background script
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'background';
  }

  // Extension pages
  if (location.protocol === 'chrome-extension:') {
    const pathname = location.pathname;
    if (pathname.includes('popup')) return 'popup';
    if (pathname.includes('sidepanel')) return 'sidepanel';
    if (pathname.includes('options')) return 'options';
    return 'extension-page';
  }

  // Content script
  return 'content';
}

/**
 * Detect development vs production environment
 */
function detectEnvironment(): 'development' | 'production' {
  try {
    if (chrome?.runtime?.getManifest) {
      const manifest = chrome.runtime.getManifest();
      // Unpacked extensions (dev) don't have update_url
      return !manifest.update_url ? 'development' : 'production';
    }
  } catch {
    // Fallback to development for safety (more verbose logging)
  }
  return 'development';
}

/**
 * Get environment-appropriate default log level
 */
function getDefaultLogLevel(): LogLevel {
  const envConfig = getLoggerEnvironmentConfig();

  // Check if environment variable specifies a level
  if (envConfig.defaultLevel) {
    const envLevel = envConfig.defaultLevel.toLowerCase();
    if (Object.values(LogLevel).includes(envLevel as LogLevel)) {
      return envLevel as LogLevel;
    }
  }

  // Default based on environment
  return envConfig.environment === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = [
    'token',
    'password',
    'secret',
    'auth',
    'bearer',
    'api_key',
    'apikey',
    'authorization',
    'session',
  ];

  const sanitized: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Persist logs to Chrome storage (debounced)
 */
async function persistLogs(): Promise<void> {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    void (async () => {
      try {
        if (chrome?.storage?.local) {
          // Trim to max entries
          if (logBuffer.length > MAX_LOG_ENTRIES) {
            logBuffer = logBuffer.slice(-MAX_LOG_ENTRIES);
          }
          await chrome.storage.local.set({ [LOG_STORAGE_KEY]: logBuffer });
        }
      } catch {
        // Silently handle persistence errors
      }
      persistTimeout = null;
    })();
  }, STORAGE_DEBOUNCE_MS);
}

/**
 * Load logs from Chrome storage
 */
async function loadStoredLogs(): Promise<LogEntry[]> {
  try {
    if (chrome?.storage?.local) {
      const result = await chrome.storage.local.get([LOG_STORAGE_KEY]);
      return result[LOG_STORAGE_KEY] || [];
    }
  } catch {
    // Silently handle storage load errors
  }
  return [];
}

/**
 * Load saved log level preference
 */
async function loadSavedLogLevel(): Promise<LogLevel | null> {
  try {
    if (chrome?.storage?.local) {
      const result = await chrome.storage.local.get([LOG_LEVEL_STORAGE_KEY]);
      const savedLevel = result[LOG_LEVEL_STORAGE_KEY];

      if (savedLevel && Object.values(LogLevel).includes(savedLevel)) {
        return savedLevel as LogLevel;
      }
    }
  } catch {
    // Silently handle log level load errors
  }
  return null;
}

/**
 * Save log level preference
 */
async function saveLogLevel(level: LogLevel): Promise<void> {
  try {
    if (chrome?.storage?.local) {
      await chrome.storage.local.set({ [LOG_LEVEL_STORAGE_KEY]: level });
    }
  } catch {
    // Silently handle log level save errors
  }
}

/**
 * Create beforeLog hook for Chrome extension features
 */
function createChromeHook(): (level: LogLevel, message: string, args: unknown[]) => void {
  const envConfig = getLoggerEnvironmentConfig();

  return (level, message, args) => {
    // Skip storage if disabled
    if (!envConfig.storageEnabled) {
      return;
    }
    const scriptType = detectScriptContext();

    // Create log entry with context
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: args[0],
      context: {
        scriptType,
        runtime: chrome?.runtime?.id,
        // Add location info if available
        ...(typeof window !== 'undefined' &&
          window?.location && {
            url: window.location.href,
            host: window.location.host,
            pathname: window.location.pathname,
            // In content scripts, tab info matches window location
            ...(scriptType === 'content' && {
              tabUrl: window.location.href,
              tabHost: window.location.host,
            }),
          }),
      },
    };

    // Store in buffer
    logBuffer.push(entry);
    void persistLogs();

    // Sanitize console output
    if (args.length > 0 && args[0] && typeof args[0] === 'object') {
      args[0] = sanitizeData(args[0]);
    }
  };
}

/**
 * Initialize logger with Chrome extension setup
 */
async function initializeLogger(): Promise<ChromeLogger> {
  const envConfig = getLoggerEnvironmentConfig();
  const savedLevel = await loadSavedLogLevel();
  const initialLevel = savedLevel || getDefaultLogLevel();

  // Load existing logs into buffer
  logBuffer = await loadStoredLogs();

  // Log configuration decision
  const configInfo = formatLoggerConfig(envConfig);
  console.log(`[ChromeLogger] Initializing with config: ${configInfo}`);

  return new ChromeLogger({
    level: initialLevel,
    consoleEnabled: envConfig.consoleEnabled,
    beforeLog: createChromeHook(),
  });
}

// Get initial configuration
const envConfig = getLoggerEnvironmentConfig();

// Create logger instance
const logger = new ChromeLogger({
  level: getDefaultLogLevel(),
  consoleEnabled: envConfig.consoleEnabled,
  beforeLog: createChromeHook(),
});

// Initialize asynchronously and update level from storage
initializeLogger()
  .then((initializedLogger) => {
    const savedLevel = initializedLogger.getCurrentLevel();
    logger.setLevel(savedLevel);

    // Log initial configuration
    logger.info('[ChromeLogger] Initialized', {
      environment: envConfig.environment,
      consoleEnabled: envConfig.consoleEnabled,
      storageEnabled: envConfig.storageEnabled,
      level: savedLevel,
    });
  })
  .catch(() => {
    // Silently handle initialization errors
  });

/**
 * Logger utilities for Chrome extension
 */
export const chromeLoggerUtils: LoggerUtils = {
  /**
   * Get current environment
   */
  getEnvironment: () => detectEnvironment(),

  /**
   * Get current log level
   */
  getCurrentLevel: () => logger.getCurrentLevel(),

  /**
   * Get logs with optional filtering
   */
  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    // Ensure buffer is loaded
    if (logBuffer.length === 0) {
      logBuffer = await loadStoredLogs();
    }

    let logs = [...logBuffer];

    if (filter) {
      const levels: Record<LogLevel, number> = {
        [LogLevel.DEBUG]: 0,
        [LogLevel.INFO]: 1,
        [LogLevel.WARN]: 2,
        [LogLevel.ERROR]: 3,
      };

      if (filter.level) {
        const minLevel = levels[filter.level];
        logs = logs.filter((log) => levels[log.level] >= minLevel);
      }

      if (filter.scriptType) {
        logs = logs.filter((log) => log.context?.scriptType === filter.scriptType);
      }

      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  },

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    logBuffer = [];
    if (chrome?.storage?.local) {
      await chrome.storage.local.remove([LOG_STORAGE_KEY]);
    }
  },

  /**
   * Export logs as JSON string
   */
  async exportLogs(): Promise<string> {
    const logs = await chromeLoggerUtils.getLogs();
    return JSON.stringify(logs, null, 2);
  },

  /**
   * Set log level and persist preference
   */
  async setLevel(level: LogLevel): Promise<void> {
    logger.setLevel(level);
    await saveLogLevel(level);
  },

  /**
   * Set log level synchronously (immediate effect)
   */
  setLevelSync(level: LogLevel): void {
    logger.setLevel(level);
  },
};

// Export main logger instance
export { logger as chromeLogger };

// Export convenience functions
export const debug = (message: string, data?: unknown) => logger.debug(message, data);
export const info = (message: string, data?: unknown) => logger.info(message, data);
export const warn = (message: string, data?: unknown) => logger.warn(message, data);
export const error = (message: string, data?: unknown) => logger.error(message, data);

// Global debug utilities (available in console)
const enableDebugLogging = () => {
  chromeLoggerUtils.setLevelSync(LogLevel.DEBUG);
  // Debug logging enabled
};

const loggerStatus = () => {
  const stats = {
    currentLevel: chromeLoggerUtils.getCurrentLevel(),
    environment: chromeLoggerUtils.getEnvironment(),
    context: detectScriptContext(),
    bufferSize: logBuffer.length,
  };
  // Logger status retrieved
  return stats;
};

// Make debugging utilities globally available
interface DebuggingGlobals {
  enableDebugLogging: typeof enableDebugLogging;
  loggerStatus: typeof loggerStatus;
}

if (typeof window !== 'undefined') {
  const win = window as unknown as Window & DebuggingGlobals;
  win.enableDebugLogging = enableDebugLogging;
  win.loggerStatus = loggerStatus;
}

if (typeof globalThis !== 'undefined') {
  const global = globalThis as unknown as typeof globalThis & DebuggingGlobals;
  global.enableDebugLogging = enableDebugLogging;
  global.loggerStatus = loggerStatus;
}
