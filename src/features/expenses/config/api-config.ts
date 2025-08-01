export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  initialRetryDelay: number;
  maxRetryDelay: number;
  defaultTimezone: string;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'https://app.navan.com/api/liquid/user',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
  defaultTimezone: 'America/Los_Angeles',
};

export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
} as const;
