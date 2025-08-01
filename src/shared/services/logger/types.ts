/**
 * Logger Type Definitions
 *
 * TypeScript types for the Chrome extension logger system
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Whether console output is enabled */
  consoleEnabled?: boolean;
  /** Hook called before console output - can modify, store, send, etc. */
  beforeLog?: (level: LogLevel, message: string, args: unknown[]) => void;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: {
    scriptType?: 'background' | 'content' | 'popup' | 'sidepanel' | 'options' | 'extension-page';
    runtime?: string;
    url?: string;
    host?: string;
    pathname?: string;
    tabUrl?: string;
    tabHost?: string;
  };
}

export interface LogFilter {
  level?: LogLevel;
  scriptType?: string;
  limit?: number;
}

export interface LoggerUtils {
  getEnvironment(): 'development' | 'production';
  getCurrentLevel(): LogLevel;
  getLogs(filter?: LogFilter): Promise<LogEntry[]>;
  clearLogs(): Promise<void>;
  exportLogs(): Promise<string>;
  setLevel(level: LogLevel): Promise<void>;
  setLevelSync(level: LogLevel): void;
}
