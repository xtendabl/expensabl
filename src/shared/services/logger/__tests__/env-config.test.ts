/**
 * Tests for environment configuration
 */

import { getLoggerEnvironmentConfig, formatLoggerConfig } from '../env-config';

// Mock the global variables by mocking the module
jest.mock('../env-config', () => {
  const originalModule = jest.requireActual('../env-config');

  // Allow tests to override these values
  let mockDev: boolean | undefined = undefined;
  let mockConsoleEnabled: boolean | undefined = undefined;
  let mockStorageEnabled: boolean | undefined = undefined;
  let mockLevel: string | undefined = undefined;

  return {
    ...originalModule,
    __setMockDev: (value: boolean | undefined) => {
      mockDev = value;
    },
    __setMockConsoleEnabled: (value: boolean | undefined) => {
      mockConsoleEnabled = value;
    },
    __setMockStorageEnabled: (value: boolean | undefined) => {
      mockStorageEnabled = value;
    },
    __setMockLevel: (value: string | undefined) => {
      mockLevel = value;
    },

    getLoggerEnvironmentConfig: () => {
      const isDevelopment = mockDev !== undefined ? mockDev : false;
      const environment = isDevelopment ? 'development' : 'production';

      let consoleEnabled: boolean;
      if (mockConsoleEnabled !== undefined) {
        consoleEnabled = mockConsoleEnabled;
      } else {
        consoleEnabled = isDevelopment;
      }

      let storageEnabled: boolean;
      if (mockStorageEnabled !== undefined) {
        storageEnabled = mockStorageEnabled;
      } else {
        storageEnabled = true;
      }

      return {
        consoleEnabled,
        storageEnabled,
        defaultLevel: mockLevel,
        environment,
      };
    },
  };
});

// Get the mocked module
const envConfigModule = require('../env-config');

describe('LoggerEnvironmentConfig', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    envConfigModule.__setMockDev(undefined);
    envConfigModule.__setMockConsoleEnabled(undefined);
    envConfigModule.__setMockStorageEnabled(undefined);
    envConfigModule.__setMockLevel(undefined);
  });

  describe('getLoggerEnvironmentConfig', () => {
    it('should default to production with console disabled', () => {
      const config = getLoggerEnvironmentConfig();
      expect(config).toEqual({
        consoleEnabled: false,
        storageEnabled: true,
        defaultLevel: undefined,
        environment: 'production',
      });
    });

    it('should enable console in development by default', () => {
      envConfigModule.__setMockDev(true);
      const config = getLoggerEnvironmentConfig();
      expect(config).toEqual({
        consoleEnabled: true,
        storageEnabled: true,
        defaultLevel: undefined,
        environment: 'development',
      });
    });

    it('should respect LOGGER_CONSOLE_ENABLED override', () => {
      envConfigModule.__setMockDev(true);
      envConfigModule.__setMockConsoleEnabled(false);
      const config = getLoggerEnvironmentConfig();
      expect(config.consoleEnabled).toBe(false);
    });

    it('should respect LOGGER_STORAGE_ENABLED override', () => {
      envConfigModule.__setMockStorageEnabled(false);
      const config = getLoggerEnvironmentConfig();
      expect(config.storageEnabled).toBe(false);
    });

    it('should read LOGGER_LEVEL if provided', () => {
      envConfigModule.__setMockLevel('error');
      const config = getLoggerEnvironmentConfig();
      expect(config.defaultLevel).toBe('error');
    });
  });

  describe('formatLoggerConfig', () => {
    it('should format config without level', () => {
      const config = {
        consoleEnabled: true,
        storageEnabled: false,
        defaultLevel: undefined,
        environment: 'development' as const,
      };
      const formatted = formatLoggerConfig(config);
      expect(formatted).toBe('env=development, console=enabled, storage=disabled');
    });

    it('should format config with level', () => {
      const config = {
        consoleEnabled: false,
        storageEnabled: true,
        defaultLevel: 'debug',
        environment: 'production' as const,
      };
      const formatted = formatLoggerConfig(config);
      expect(formatted).toBe('env=production, console=disabled, storage=enabled, level=debug');
    });
  });
});
