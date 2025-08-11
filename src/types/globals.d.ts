declare const __DEV__: boolean;
declare const _LOGGER_CONSOLE_ENABLED: boolean | undefined;
declare const _LOGGER_STORAGE_ENABLED: boolean | undefined;
declare const _LOGGER_LEVEL: string | undefined;

declare namespace _NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    LOGGER_CONSOLE_ENABLED?: string;
    LOGGER_STORAGE_ENABLED?: string;
    LOGGER_LEVEL?: string;
  }
}

// Chrome extension window extensions
interface ApiTestResult {
  parameter: string;
  value: string | number | boolean;
  status: 'success' | 'error';
  message?: string;
  responseCode?: number;
}

declare global {
  interface Window {
    testApiParameters?: () => Promise<void | ApiTestResult[]>;
    sendMessage?: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
    sidepanelUI?: unknown;
  }
}

export {};
