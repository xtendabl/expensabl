/**
 * Base error class for API-related errors.
 * Includes HTTP status code and optional response data from the API.
 *
 * @example
 * ```typescript
 * try {
 *   await apiCall();
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(`API Error ${error.statusCode}: ${error.message}`);
 *     console.log('Response data:', error.responseData);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code from the API response
   * @param responseData - Optional raw response data from the API
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Error thrown when authentication fails or token is missing.
 *
 * @example
 * ```typescript
 * try {
 *   await authenticatedApiCall();
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.log('Please log in again');
 *     redirectToLogin();
 *   }
 * }
 * ```
 */
export class AuthenticationError extends Error {
  /**
   * Creates a new AuthenticationError instance.
   *
   * @param message - Error message (defaults to 'Authentication failed')
   */
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when request validation fails.
 * Includes the specific field that failed validation when available.
 *
 * @example
 * ```typescript
 * try {
 *   validateExpenseData(data);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(`Validation failed for field: ${error.field}`);
 *     highlightFieldError(error.field);
 *   }
 * }
 * ```
 */
export class ValidationError extends Error {
  /**
   * Creates a new ValidationError instance.
   *
   * @param message - Detailed validation error message
   * @param field - Optional field name that failed validation
   */
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when a request times out.
 *
 * @example
 * ```typescript
 * try {
 *   await apiCallWithTimeout();
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log('Request timed out, please try again');
 *     showRetryButton();
 *   }
 * }
 * ```
 */
export class TimeoutError extends Error {
  /**
   * Creates a new TimeoutError instance.
   *
   * @param message - Error message (defaults to 'Request timed out')
   */
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a network request fails.
 * Typically indicates connectivity issues or DNS resolution problems.
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.log('Check your internet connection');
 *     showOfflineMode();
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * Creates a new NetworkError instance.
   *
   * @param message - Error message (defaults to 'Network request failed')
   */
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
