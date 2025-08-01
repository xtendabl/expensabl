import { ApiError, AuthenticationError, TimeoutError, NetworkError } from '../errors';
import { HttpMethod } from '../../../shared/types/common';
import { ApiConfig } from '../config/api-config';
import { RetryPolicy, RetryAttempt } from './retry-policy';
import { RequestBuilder, RequestOptions } from './request-builder';
import { ResponseNormalizer } from './response-normalizer';
import { chromeLogger } from '../../../shared/services/logger/chrome-logger-setup';

// Token provider interface
export interface TokenProvider {
  getToken(): Promise<string | null>;
}

// Create simple logger functions
const debug = (_message: string, _data?: unknown) => {
  // Development-only debug logging
};
const info = (_message: string, _data?: unknown) => {
  // Development-only info logging
};
const warn = (_message: string, _data?: unknown) => {
  // Development-only warn logging
};
const error = (_message: string, _data?: unknown) => {
  // Development-only error logging
};

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  getWithParams<T>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T>;
}

/**
 * HTTP client with automatic retry, timeout handling, and response normalization
 * for the Navan API.
 *
 * @class ApiHttpClient
 * @implements {HttpClient}
 *
 * @remarks
 * Features:
 * - **Automatic retry** with exponential backoff for transient failures
 * - **Timeout handling** with configurable limits per request
 * - **Token injection** from async token provider
 * - **Response normalization** for different API response formats
 * - **Comprehensive error types** for different failure scenarios
 *
 * The client automatically retries on:
 * - 5xx server errors
 * - 429 rate limit errors
 * - Network failures
 * - Timeout errors
 *
 * @example
 * ```typescript
 * const client = new ApiHttpClient(config, tokenProvider);
 *
 * // Automatic retry on failure
 * const data = await client.get('/expenses/123');
 *
 * // Custom timeout for long operations
 * const result = await client.post('/expenses', payload, {
 *   timeout: 30000 // 30 seconds
 * });
 * ```
 */
export class ApiHttpClient implements HttpClient {
  private readonly retryPolicy: RetryPolicy;
  private readonly requestBuilder: RequestBuilder;
  private readonly responseNormalizer: ResponseNormalizer;
  private tokenProvider: TokenProvider | null = null;

  constructor(
    private config: ApiConfig,
    tokenProvider?: TokenProvider
  ) {
    this.retryPolicy = new RetryPolicy(config);
    this.requestBuilder = new RequestBuilder(config);
    this.responseNormalizer = new ResponseNormalizer();
    this.tokenProvider = tokenProvider || null;
  }

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.requestBuilder.buildUrl(path);
    return this.makeAuthenticatedRequest<T>(url, HttpMethod.GET, options);
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.requestBuilder.buildUrl(path);
    return this.makeAuthenticatedRequest<T>(url, HttpMethod.POST, { ...options, body });
  }

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.requestBuilder.buildUrl(path);
    return this.makeAuthenticatedRequest<T>(url, HttpMethod.PATCH, { ...options, body });
  }

  async getWithParams<T>(
    path: string,
    params?: Record<string, unknown>,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.requestBuilder.buildUrlWithParams(path, params);
    return this.makeAuthenticatedRequest<T>(url, HttpMethod.GET, options);
  }

  private async makeAuthenticatedRequest<T>(
    url: string,
    method: HttpMethod,
    options: RequestOptions = {}
  ): Promise<T> {
    const operationId = `${method} ${new URL(url).pathname}`;
    const operationStart = performance.now();

    const token = this.tokenProvider ? await this.tokenProvider.getToken() : null;
    if (token === null) {
      error('ApiHttpClient: No authentication token available', {
        operationId,
        url,
        method,
        timingMs: Math.round(performance.now() - operationStart),
      });
      throw new AuthenticationError('No authentication token available');
    }

    const retries = this.config.maxRetries;
    let lastError: Error | undefined;
    const retryAttempts: RetryAttempt[] = [];

    debug('ApiHttpClient: Starting authenticated request with retry policy', {
      operationId,
      url,
      method,
      maxRetries: retries,
    });

    for (let attempt = 0; attempt < retries; attempt++) {
      const attemptStart = performance.now();

      try {
        const result = await this.makeSingleRequest<T>(url, method, options, token);

        const totalTime = Math.round(performance.now() - operationStart);
        if (retryAttempts.length > 0) {
          info('ApiHttpClient: Request succeeded after retries', {
            operationId,
            timing: { total: totalTime, attempts: attempt + 1, retries: retryAttempts.length },
            retryHistory: retryAttempts,
          });
        } else {
          debug('ApiHttpClient: Request succeeded on first attempt', {
            operationId,
            timing: { total: totalTime, attempts: 1 },
          });
        }

        return result;
      } catch (err) {
        const attemptTime = Math.round(performance.now() - attemptStart);
        lastError = err as Error;

        const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';
        const statusCode = err instanceof ApiError ? err.statusCode : undefined;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        if (!this.retryPolicy.shouldRetry(err, attempt)) {
          const totalTime = Math.round(performance.now() - operationStart);
          error('ApiHttpClient: Request failed with non-retryable error', {
            operationId,
            error: errorMessage,
            errorType,
            statusCode,
            timing: { total: totalTime, attempts: attempt + 1 },
          });
          throw err;
        }

        const delay = this.retryPolicy.calculateDelay(attempt);
        retryAttempts.push({
          attempt: attempt + 1,
          error: errorMessage,
          errorType,
          statusCode,
          delayMs: delay,
          totalTimeMs: attemptTime,
        });

        warn('ApiHttpClient: Request failed, will retry', {
          operationId,
          retry: {
            currentAttempt: attempt + 1,
            maxRetries: retries,
            nextDelayMs: delay,
          },
          error: { message: errorMessage, type: errorType, statusCode },
        });

        await this.retryPolicy.delay(delay);
      }
    }

    const totalTime = Math.round(performance.now() - operationStart);
    error('ApiHttpClient: Request failed after all retries exhausted', {
      operationId,
      finalError: lastError?.message || 'Unknown error',
      timing: { total: totalTime, attempts: retries, retries: retryAttempts.length },
      retryHistory: retryAttempts,
    });

    throw lastError || new Error('Request failed after retries');
  }

  private async makeSingleRequest<T>(
    url: string,
    method: HttpMethod,
    options: RequestOptions,
    token: string
  ): Promise<T> {
    const { timeout = this.config.timeout } = options;
    const operationId = `${method} ${new URL(url).pathname}`;
    const startTime = performance.now();

    const fetchOptions = this.requestBuilder.buildFetchOptions(method, options, token);
    const correlationId = `${operationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    info('[HTTP_CLIENT] Making API request', {
      correlationId,
      url,
      method,
      timestamp: Date.now(),
      hasBody: !!options.body,
    });

    debug('ApiHttpClient: Making API request', {
      operationId,
      correlationId,
      url,
      method,
      hasBody: !!options.body,
      timeout,
    });

    try {
      const response = await fetch(url, fetchOptions);
      const responseTime = Math.round(performance.now() - startTime);

      if (responseTime > 5000) {
        warn('ApiHttpClient: Slow API request detected', {
          operationId,
          responseTimeMs: responseTime,
          threshold: 5000,
        });
      }

      await this.throwIfNotOk(response, operationId, correlationId);

      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || response.status === 204) {
        debug('ApiHttpClient: Empty response received', {
          operationId,
          status: response.status,
          responseTimeMs: responseTime,
        });
        return {} as T;
      }

      const responseText = await response.text();
      let data: T;

      try {
        data = responseText ? (JSON.parse(responseText) as T) : ({} as T);
      } catch (parseError) {
        error('ApiHttpClient: Failed to parse JSON response', {
          operationId,
          correlationId,
          status: response.status,
          responseText: this.responseNormalizer.truncateForLogging(responseText),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        });
        throw new ApiError('Invalid JSON response', response.status, { responseText });
      }

      info('ApiHttpClient: Request completed successfully', {
        operationId,
        correlationId,
        status: response.status,
        timing: { total: responseTime },
        response: {
          size: responseText.length,
          structure: this.responseNormalizer.analyzeResponseStructure(data),
        },
      });

      return data;
    } catch (err) {
      const errorTime = Math.round(performance.now() - startTime);

      if (err instanceof Error && err.name === 'AbortError') {
        error('ApiHttpClient: Request timed out', {
          operationId,
          correlationId,
          timeoutMs: timeout,
          actualTimeMs: errorTime,
        });
        throw new TimeoutError(`Request timed out after ${timeout}ms`);
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        error('ApiHttpClient: Network request failed', {
          operationId,
          correlationId,
          error: err.message,
          timingMs: errorTime,
        });
        throw new NetworkError(`Network request failed: ${err.message}`);
      }

      throw err;
    }
  }

  private async throwIfNotOk(
    response: Response,
    operationId: string,
    correlationId: string
  ): Promise<void> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Failed to parse error response',
        status: response.status,
      }));

      error('ApiHttpClient: API request failed', {
        operationId,
        correlationId,
        status: response.status,
        statusText: response.statusText,
        errorMessage: errorData.message || errorData.error || 'Unknown error',
        errorDetails: errorData,
      });

      throw new ApiError(
        errorData.message || errorData.error || 'Unknown error',
        response.status,
        errorData
      );
    }
  }
}
