import { ChromeLogger } from '../chrome-logger';
import { LogLevel } from '../types';

describe('ChromeLogger', () => {
  let logger: ChromeLogger;

  beforeEach(() => {
    logger = new ChromeLogger();
  });

  describe('constructor', () => {
    it('should initialize with default log level INFO', () => {
      expect(logger.getCurrentLevel()).toBe(LogLevel.INFO);
    });

    it('should initialize with custom log level', () => {
      const customLogger = new ChromeLogger({ level: LogLevel.DEBUG });
      expect(customLogger.getCurrentLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe('setLevel', () => {
    it('should update the log level', () => {
      logger.setLevel(LogLevel.WARN);
      expect(logger.getCurrentLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('logging methods', () => {
    it('should handle debug messages', () => {
      expect(() => logger.debug('debug message', { extra: 'data' })).not.toThrow();
    });

    it('should handle info messages', () => {
      expect(() => logger.info('info message', 'additional', 'args')).not.toThrow();
    });

    it('should handle warn messages', () => {
      expect(() => logger.warn('warn message')).not.toThrow();
    });

    it('should handle error messages', () => {
      const error = new Error('test error');
      expect(() => logger.error('error message', error)).not.toThrow();
    });

    it('should handle multiple arguments', () => {
      expect(() => logger.info('message', 'arg1', 'arg2', 'arg3')).not.toThrow();
    });
  });

  describe('beforeLog hooks', () => {
    it('should execute hooks before logging', () => {
      const hook = jest.fn();
      const loggerWithHook = new ChromeLogger({ beforeLog: hook });

      loggerWithHook.info('test message', { data: 'value' });

      expect(hook).toHaveBeenCalledWith(LogLevel.INFO, 'test message', [{ data: 'value' }]);
    });

    it('should handle hook errors gracefully', () => {
      const errorHook = jest.fn(() => {
        throw new Error('Hook error');
      });
      const loggerWithErrorHook = new ChromeLogger({ beforeLog: errorHook });

      // Should not throw and should still log
      expect(() => loggerWithErrorHook.info('test message')).not.toThrow();

      expect(errorHook).toHaveBeenCalled();
    });

    it('should not execute hooks for filtered messages', () => {
      const hook = jest.fn();
      const loggerWithHook = new ChromeLogger({ level: LogLevel.WARN, beforeLog: hook });

      loggerWithHook.debug('debug message');
      loggerWithHook.info('info message');

      expect(hook).not.toHaveBeenCalled();
    });

    it('should pass correct parameters to hooks', () => {
      const hook = jest.fn();
      const loggerWithHook = new ChromeLogger({ beforeLog: hook });

      const testArgs: [string, ...unknown[]] = ['message', { key: 'value' }, 123, true];
      loggerWithHook.warn(...testArgs);

      expect(hook).toHaveBeenCalledWith(LogLevel.WARN, testArgs[0], testArgs.slice(1));
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle circular reference objects', () => {
      const circularObj: any = { prop: 'value' };
      circularObj.self = circularObj;

      expect(() => logger.info('message', circularObj)).not.toThrow();
    });

    it('should handle null and undefined values', () => {
      expect(() => logger.info('message', null, undefined)).not.toThrow();
    });

    it('should handle very large argument lists', () => {
      const args = Array.from({ length: 100 }, (_, i) => `arg${i}`);

      expect(() => logger.info('message', ...args)).not.toThrow();
    });

    it('should handle functions as arguments', () => {
      const testFunction = () => 'test';

      expect(() => logger.info('message', testFunction)).not.toThrow();
    });
  });
});
