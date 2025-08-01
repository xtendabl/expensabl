/**
 * Environment Configuration for Logger
 *
 * Reads environment variables and provides configuration for the logger system.
 * Environment variables can be set at build time via webpack DefinePlugin.
 */

export interface LoggerEnvironmentConfig {
  /** Whether console output is enabled */
  consoleEnabled: boolean;
  /** Whether storage persistence is enabled */
  storageEnabled: boolean;
  /** Default log level from environment */
  defaultLevel?: string;
  /** Environment type */
  environment: 'development' | 'production';
}

declare const LOGGER_CONSOLE_ENABLED: boolean | undefined;
declare const LOGGER_STORAGE_ENABLED: boolean | undefined;
declare const LOGGER_LEVEL: string | undefined;
declare const __DEV__: boolean;

/**
 * Read logger configuration from environment variables
 */
export function getLoggerEnvironmentConfig(): LoggerEnvironmentConfig {
  // Detect environment
  const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const environment = isDevelopment ? 'development' : 'production';

  // Console output configuration
  let consoleEnabled: boolean;
  if (typeof LOGGER_CONSOLE_ENABLED !== 'undefined') {
    // Explicit environment variable takes precedence
    consoleEnabled = LOGGER_CONSOLE_ENABLED;
  } else {
    // Default: enabled in development, disabled in production
    consoleEnabled = isDevelopment;
  }

  // Storage configuration
  let storageEnabled: boolean;
  if (typeof LOGGER_STORAGE_ENABLED !== 'undefined') {
    // Explicit environment variable takes precedence
    storageEnabled = LOGGER_STORAGE_ENABLED;
  } else {
    // Default: always enabled
    storageEnabled = true;
  }

  // Default log level
  const defaultLevel = typeof LOGGER_LEVEL !== 'undefined' ? LOGGER_LEVEL : undefined;

  return {
    consoleEnabled,
    storageEnabled,
    defaultLevel,
    environment,
  };
}

/**
 * Format configuration for logging
 */
export function formatLoggerConfig(config: LoggerEnvironmentConfig): string {
  const parts = [
    `env=${config.environment}`,
    `console=${config.consoleEnabled ? 'enabled' : 'disabled'}`,
    `storage=${config.storageEnabled ? 'enabled' : 'disabled'}`,
  ];

  if (config.defaultLevel) {
    parts.push(`level=${config.defaultLevel}`);
  }

  return parts.join(', ');
}
