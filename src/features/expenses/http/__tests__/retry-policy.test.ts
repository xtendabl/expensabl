import { RetryPolicy } from '../retry-policy';
import { ApiConfig } from '../../config/api-config';
import { ApiError, AuthenticationError, ValidationError, TimeoutError } from '../../errors';

describe('RetryPolicy', () => {
  let retryPolicy: RetryPolicy;
  let mockConfig: ApiConfig;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      defaultTimezone: 'America/Los_Angeles',
    };

    retryPolicy = new RetryPolicy(mockConfig);
  });

  describe('shouldRetry', () => {
    it('should retry on server errors (5xx)', () => {
      const serverError = new ApiError('Server error', 500, 'Internal Server Error');

      const shouldRetry = retryPolicy.shouldRetry(serverError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on 502 Bad Gateway', () => {
      const badGatewayError = new ApiError('Bad gateway', 502, 'Bad Gateway');

      const shouldRetry = retryPolicy.shouldRetry(badGatewayError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on 503 Service Unavailable', () => {
      const serviceUnavailableError = new ApiError(
        'Service unavailable',
        503,
        'Service Unavailable'
      );

      const shouldRetry = retryPolicy.shouldRetry(serviceUnavailableError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on 429 rate limit errors', () => {
      const rateLimitError = new ApiError('Rate limited', 429, 'Too Many Requests');

      const shouldRetry = retryPolicy.shouldRetry(rateLimitError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on timeout errors', () => {
      const timeoutError = new TimeoutError('Request timeout');

      const shouldRetry = retryPolicy.shouldRetry(timeoutError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on network errors', () => {
      const networkError = new Error('network connection failed');

      const shouldRetry = retryPolicy.shouldRetry(networkError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should retry on fetch errors', () => {
      const fetchError = new Error('failed to fetch data');

      const shouldRetry = retryPolicy.shouldRetry(fetchError, 0);

      expect(shouldRetry).toBe(true);
    });

    it('should not retry on 4xx client errors (except 429)', () => {
      const clientError = new ApiError('Bad request', 400, 'Bad Request');

      const shouldRetry = retryPolicy.shouldRetry(clientError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on 401 authentication errors', () => {
      const authError = new ApiError('Unauthorized', 401, 'Unauthorized');

      const shouldRetry = retryPolicy.shouldRetry(authError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on 404 not found errors', () => {
      const notFoundError = new ApiError('Not found', 404, 'Not Found');

      const shouldRetry = retryPolicy.shouldRetry(notFoundError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on authentication errors', () => {
      const authError = new AuthenticationError('Authentication failed');

      const shouldRetry = retryPolicy.shouldRetry(authError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on validation errors', () => {
      const validationError = new ValidationError('Validation failed');

      const shouldRetry = retryPolicy.shouldRetry(validationError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry when maximum attempts reached', () => {
      const serverError = new ApiError('Server error', 500, 'Internal Server Error');

      const shouldRetry = retryPolicy.shouldRetry(serverError, mockConfig.maxRetries - 1);

      expect(shouldRetry).toBe(false);
    });

    it('should not retry on unknown errors', () => {
      const unknownError = new Error('Some unknown error');

      const shouldRetry = retryPolicy.shouldRetry(unknownError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const stringError = 'String error message';

      const shouldRetry = retryPolicy.shouldRetry(stringError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      const shouldRetryNull = retryPolicy.shouldRetry(null, 0);
      const shouldRetryUndefined = retryPolicy.shouldRetry(undefined, 0);

      expect(shouldRetryNull).toBe(false);
      expect(shouldRetryUndefined).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delay0 = retryPolicy.calculateDelay(0);
      const delay1 = retryPolicy.calculateDelay(1);
      const delay2 = retryPolicy.calculateDelay(2);

      expect(delay0).toBe(1000); // 1000 * 2^0 = 1000
      expect(delay1).toBe(2000); // 1000 * 2^1 = 2000
      expect(delay2).toBe(4000); // 1000 * 2^2 = 4000
    });

    it('should cap delay at maximum value', () => {
      const largeAttempt = 10;
      const delay = retryPolicy.calculateDelay(largeAttempt);

      expect(delay).toBe(mockConfig.maxRetryDelay);
    });

    it('should handle zero attempt number', () => {
      const delay = retryPolicy.calculateDelay(0);

      expect(delay).toBe(mockConfig.initialRetryDelay);
    });

    it('should handle negative attempt numbers', () => {
      const delay = retryPolicy.calculateDelay(-1);

      expect(delay).toBe(mockConfig.initialRetryDelay / 2); // 1000 * 2^(-1) = 500
    });

    it('should respect initial retry delay configuration', () => {
      const customConfig = { ...mockConfig, initialRetryDelay: 2000 };
      const customRetryPolicy = new RetryPolicy(customConfig);

      const delay = customRetryPolicy.calculateDelay(0);

      expect(delay).toBe(2000);
    });

    it('should respect max retry delay configuration', () => {
      const customConfig = { ...mockConfig, maxRetryDelay: 5000 };
      const customRetryPolicy = new RetryPolicy(customConfig);

      const delay = customRetryPolicy.calculateDelay(10);

      expect(delay).toBe(5000);
    });
  });

  describe('delay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait for specified milliseconds', async () => {
      const delayPromise = retryPolicy.delay(1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      await expect(delayPromise).resolves.toBeUndefined();
    });

    it('should not resolve before specified time', async () => {
      const delayPromise = retryPolicy.delay(1000);
      let resolved = false;

      void delayPromise.then(() => {
        resolved = true;
      });

      // Advance time by less than the delay
      jest.advanceTimersByTime(500);

      // Should not be resolved yet
      expect(resolved).toBe(false);
    });

    it('should handle zero delay', async () => {
      const delayPromise = retryPolicy.delay(0);

      jest.advanceTimersByTime(0);

      await expect(delayPromise).resolves.toBeUndefined();
    });

    it('should handle negative delay', async () => {
      const delayPromise = retryPolicy.delay(-100);

      jest.advanceTimersByTime(0);

      await expect(delayPromise).resolves.toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should provide correct retry decisions for common scenarios', () => {
      // Server overload scenario - should retry
      const serverOverloadError = new ApiError('Server overloaded', 503, 'Service Unavailable');
      expect(retryPolicy.shouldRetry(serverOverloadError, 0)).toBe(true);
      expect(retryPolicy.shouldRetry(serverOverloadError, 1)).toBe(true);
      expect(retryPolicy.shouldRetry(serverOverloadError, 2)).toBe(false); // Max retries reached

      // Rate limiting scenario - should retry
      const rateLimitError = new ApiError('Rate limited', 429, 'Too Many Requests');
      expect(retryPolicy.shouldRetry(rateLimitError, 0)).toBe(true);

      // Authentication failure - should not retry
      const authError = new ApiError('Unauthorized', 401, 'Unauthorized');
      expect(retryPolicy.shouldRetry(authError, 0)).toBe(false);

      // Client error - should not retry
      const clientError = new ApiError('Bad request', 400, 'Bad Request');
      expect(retryPolicy.shouldRetry(clientError, 0)).toBe(false);
    });

    it('should calculate progressive delays correctly', () => {
      const delays = [0, 1, 2, 3, 4].map((attempt) => retryPolicy.calculateDelay(attempt));

      expect(delays[0]).toBe(1000); // Initial delay
      expect(delays[1]).toBe(2000); // 2x initial
      expect(delays[2]).toBe(4000); // 4x initial
      expect(delays[3]).toBe(8000); // 8x initial
      expect(delays[4]).toBe(16000); // 16x initial
    });

    it('should handle edge cases in retry logic', () => {
      // Test with exactly max retries - 1
      const serverError = new ApiError('Server error', 500, 'Internal Server Error');
      expect(retryPolicy.shouldRetry(serverError, mockConfig.maxRetries - 2)).toBe(true);
      expect(retryPolicy.shouldRetry(serverError, mockConfig.maxRetries - 1)).toBe(false);
    });
  });

  describe('error classification edge cases', () => {
    it('should handle errors with missing status codes', () => {
      const errorWithoutStatus = new Error('Generic error') as any;
      errorWithoutStatus.statusCode = undefined;

      const shouldRetry = retryPolicy.shouldRetry(errorWithoutStatus, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should handle ApiError with invalid status codes', () => {
      const invalidStatusError = new ApiError('Invalid status', 0, 'Invalid');

      const shouldRetry = retryPolicy.shouldRetry(invalidStatusError, 0);

      expect(shouldRetry).toBe(false);
    });

    it('should identify network-related error messages', () => {
      const networkErrors = [
        new Error('network timeout occurred'),
        new Error('connection network failed'),
        new Error('network error detected'),
      ];

      networkErrors.forEach((error) => {
        expect(retryPolicy.shouldRetry(error, 0)).toBe(true);
      });
    });

    it('should identify fetch-related error messages', () => {
      const fetchErrors = [
        new Error('failed to fetch resource'),
        new Error('fetch request timeout'),
        new Error('could not fetch data'),
      ];

      fetchErrors.forEach((error) => {
        expect(retryPolicy.shouldRetry(error, 0)).toBe(true);
      });
    });
  });
});
