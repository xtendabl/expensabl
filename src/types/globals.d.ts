declare const __DEV__: boolean;
declare const LOGGER_CONSOLE_ENABLED: boolean | undefined;
declare const LOGGER_STORAGE_ENABLED: boolean | undefined;
declare const LOGGER_LEVEL: string | undefined;

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    LOGGER_CONSOLE_ENABLED?: string;
    LOGGER_STORAGE_ENABLED?: string;
    LOGGER_LEVEL?: string;
  }
}
