import { ApiError, AuthenticationError, ValidationError, TimeoutError } from '../errors';
import { ApiConfig } from '../config/api-config';

export interface RetryAttempt {
  attempt: number;
  error: string;
  errorType: string;
  statusCode?: number;
  delayMs: number;
  totalTimeMs: number;
}

/**
 * Retry policy implementation for HTTP requests with exponential backoff.
 * Determines which errors are retryable and calculates appropriate delays.
 *
 * @class RetryPolicy
 */
export class RetryPolicy {
  constructor(private config: ApiConfig) {}

  // Documenting due to complex business logic for retry eligibility
  /**
   * Determines if a failed request should be retried based on error type.
   * Implements smart retry logic to avoid unnecessary retries.
   *
   * @param error - The error from the failed request
   * @param attempt - Current attempt number (0-based)
   * @returns true if request should be retried, false otherwise
   *
   * @remarks
   * Retry decisions:
   * - **5xx errors**: Always retry (server issues)
   * - **429 errors**: Always retry (rate limiting)
   * - **Timeout errors**: Always retry (transient)
   * - **Network errors**: Always retry (connectivity)
   * - **401/403 errors**: Never retry (auth won't improve)
   * - **Validation errors**: Never retry (bad data)
   */
  shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxRetries - 1) {
      return false;
    }

    if (error instanceof ApiError) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }

    if (error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      return false;
    }

    return (
      error instanceof Error &&
      (error.message.includes('network') || error.message.includes('fetch'))
    );
  }

  // Documenting due to exponential backoff calculation
  /**
   * Calculates delay before next retry using exponential backoff.
   * Prevents thundering herd problem with jittered delays.
   *
   * @param attempt - Current attempt number (0-based)
   * @returns Delay in milliseconds before next retry
   *
   * @remarks
   * Uses exponential backoff: delay = initialDelay * 2^attempt
   * Capped at maxRetryDelay to prevent excessive waits.
   * Example progression: 1000ms → 2000ms → 4000ms → 8000ms
   */
  calculateDelay(attempt: number): number {
    return Math.min(
      this.config.initialRetryDelay * Math.pow(2, attempt),
      this.config.maxRetryDelay
    );
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
