/**
 * Chrome Extension Logger
 *
 * A minimal logger optimized for Chrome extension environments
 * with cross-context compatibility and persistent storage.
 */

import { LogLevel, LoggerOptions } from './types';

export class ChromeLogger {
  private levels: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  private currentLevel: number;
  private consoleEnabled: boolean;
  private beforeLog?: LoggerOptions['beforeLog'];

  constructor(options: LoggerOptions = {}) {
    this.currentLevel = this.levels[options.level || LogLevel.INFO];
    this.consoleEnabled = options.consoleEnabled ?? false;
    this.beforeLog = options.beforeLog;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (this.levels[level] < this.currentLevel) return;

    // Make a mutable copy of args for potential modification
    const mutableArgs = [...args];

    // Hook for extensions (storage, sanitization, etc.)
    if (this.beforeLog) {
      try {
        this.beforeLog(level, message, mutableArgs);
      } catch {
        // Silently handle hook errors
      }
    }

    // Console output based on configuration
    if (this.consoleEnabled) {
      const consoleMethod = this.getConsoleMethod(level);
      consoleMethod(message, ...mutableArgs);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug.bind(console);
      case LogLevel.INFO:
        return console.info.bind(console);
      case LogLevel.WARN:
        return console.warn.bind(console);
      case LogLevel.ERROR:
        return console.error.bind(console);
      default:
        return console.log.bind(console);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = this.levels[level];
  }

  getCurrentLevel(): LogLevel {
    for (const [level, value] of Object.entries(this.levels)) {
      if (value === this.currentLevel) {
        return level as LogLevel;
      }
    }
    return LogLevel.INFO;
  }

  setConsoleEnabled(enabled: boolean): void {
    this.consoleEnabled = enabled;
  }

  isConsoleEnabled(): boolean {
    return this.consoleEnabled;
  }
}
