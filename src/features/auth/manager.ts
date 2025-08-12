import { StorageManager } from '../../shared/services/storage/transaction/manager';
import { chromeStorageProvider } from '../../shared/services/storage/providers/chrome-storage';

const storageManager = new StorageManager(chromeStorageProvider);
import { debug, info, warn, error } from '../../shared/services/logger/chrome-logger-setup';
import { AuthStatus, TokenData, TokenValidator } from './types';
import { TripActionsTokenValidator } from './validators/token-validator';
import { sanitizePayloadQuick } from '../../shared/utils/payload-sanitizer';

const TOKEN_STORAGE_KEY = 'auth-token';
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Token management implementation for Chrome extension authentication.
 * Uses the shared storage manager for persistence with automatic validation and expiry.
 */
export class AuthManager {
  constructor(
    private readonly storage = storageManager,
    private readonly validator: TokenValidator = new TripActionsTokenValidator()
  ) {}

  /**
   * Saves a new authentication token after validation.
   *
   * @param token - The authentication token to save
   * @param source - The origin/context where the token was captured
   * @returns true if the token was saved successfully, false if validation failed
   */
  async save(token: string, source: string): Promise<boolean> {
    const operationStart = performance.now();
    const operationId = `auth_save_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Comprehensive token analysis for debugging
    const tokenAnalysis = {
      length: token?.length || 0,
      isEmpty: !token || token.length === 0,
      hasPrefix: token?.startsWith(this.validator.getPrefix()) || false,
      expectedPrefix: this.validator.getPrefix(),
      preview: token ? `${token.substring(0, 15)}...` : 'empty',
      structure: {
        startsWithBearer: token?.toLowerCase().startsWith('bearer ') || false,
        startsWithTripActions: token?.toLowerCase().startsWith('tripactions') || false,
        containsSpaces: token?.includes(' ') || false,
        containsDashes: token?.includes('-') || false,
        containsUnderscores: token?.includes('_') || false,
      },
    };

    info('AUTH_FLOW: Token save initiated', {
      operation: 'saveToken',
      operationId,
      source,
      tokenAnalysis,
      timestamp: Date.now(),
    });

    // Detailed validation logging
    const validationStart = performance.now();
    const isValid = this.validator.validate(token);
    const validationTime = Math.round(performance.now() - validationStart);

    info('AUTH_FLOW: Token validation completed', {
      operationId,
      validation: {
        isValid,
        validationTime,
        source,
        tokenAnalysis,
        validatorType: this.validator.constructor.name,
      },
    });

    if (!isValid) {
      warn('AUTH_FLOW: Token validation failed', {
        operationId,
        source,
        validationFailure: {
          reason: 'Format validation failed',
          tokenAnalysis,
          expectedPrefix: this.validator.getPrefix(),
          actualPrefix: token?.substring(0, 20) || 'empty',
        },
        timing: { validationTime },
      });
      return false;
    }

    try {
      const storageStart = performance.now();
      const data: TokenData = {
        token,
        source,
        capturedAt: Date.now(),
        lastUsed: Date.now(),
        expiresAt: Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      };

      await this.storage.execute(async (tx) => {
        tx.set(TOKEN_STORAGE_KEY, data);
      });

      const storageTime = Math.round(performance.now() - storageStart);
      const totalTime = Math.round(performance.now() - operationStart);

      info('AUTH_FLOW: Token saved successfully', {
        operationId,
        source,
        success: true,
        timing: {
          total: totalTime,
          validation: validationTime,
          storage: storageTime,
        },
        tokenMetadata: sanitizePayloadQuick({
          source,
          capturedAt: data.capturedAt,
          expiresAt: data.expiresAt,
          expiryHours: TOKEN_EXPIRY_HOURS,
        }),
      });

      return true;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);

      error('AUTH_FLOW: Token save failed', {
        operationId,
        source,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime, validation: validationTime },
        tokenAnalysis,
      });

      return false;
    }
  }

  /**
   * Retrieves the current valid authentication token.
   *
   * @returns The token string if a valid non-expired token exists, null otherwise
   */
  async get(): Promise<string | null> {
    const operationStart = performance.now();
    const operationId = `auth_get_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    debug('AUTH_FLOW: Token retrieval initiated', {
      operation: 'getToken',
      operationId,
      timestamp: Date.now(),
    });

    try {
      const storageStart = performance.now();
      const data = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });
      const storageTime = Math.round(performance.now() - storageStart);

      if (!data) {
        const totalTime = Math.round(performance.now() - operationStart);
        info('AUTH_FLOW: No token found in storage', {
          operationId,
          result: 'no_token',
          timing: { total: totalTime, storage: storageTime },
        });
        return null;
      }

      // Analyze token data
      const now = Date.now();
      const tokenAge = now - data.capturedAt;
      const timeUntilExpiry = data.expiresAt ? data.expiresAt - now : 0;
      const isExpired = this.isExpired(data);

      const tokenMetadata = {
        source: data.source,
        capturedAt: data.capturedAt,
        lastUsed: data.lastUsed,
        expiresAt: data.expiresAt,
        age: {
          milliseconds: tokenAge,
          minutes: Math.round(tokenAge / 1000 / 60),
          hours: Math.round(tokenAge / 1000 / 60 / 60),
        },
        expiry: {
          timeUntilExpiry,
          minutesUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60),
          isExpired,
          isNearExpiry: timeUntilExpiry < 60 * 60 * 1000, // Less than 1 hour
        },
      };

      if (isExpired) {
        const totalTime = Math.round(performance.now() - operationStart);
        warn('AUTH_FLOW: Token has expired', {
          operationId,
          result: 'expired_token',
          tokenMetadata,
          timing: { total: totalTime, storage: storageTime },
          expiredBy: {
            milliseconds: Math.abs(timeUntilExpiry),
            minutes: Math.round(Math.abs(timeUntilExpiry) / 1000 / 60),
          },
        });
        return null;
      }

      const totalTime = Math.round(performance.now() - operationStart);

      info('AUTH_FLOW: Valid token retrieved', {
        operationId,
        result: 'valid_token',
        tokenMetadata: sanitizePayloadQuick(tokenMetadata),
        timing: { total: totalTime, storage: storageTime },
        tokenHealth: {
          isValid: true,
          isNearExpiry: tokenMetadata.expiry.isNearExpiry,
          ageCategory:
            tokenAge < 60 * 60 * 1000
              ? 'fresh'
              : tokenAge < 12 * 60 * 60 * 1000
                ? 'moderate'
                : 'old',
        },
      });

      // Update last used timestamp
      try {
        await this.storage.execute(async (tx) => {
          tx.set(TOKEN_STORAGE_KEY, { ...data, lastUsed: now });
        });
        debug('AUTH_FLOW: Token last used timestamp updated', { operationId });
      } catch (updateErr) {
        warn('AUTH_FLOW: Failed to update last used timestamp', {
          operationId,
          error: updateErr instanceof Error ? updateErr.message : 'Unknown error',
        });
      }

      return data.token;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);
      error('AUTH_FLOW: Token retrieval failed', {
        operationId,
        result: 'retrieval_error',
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
      });
      return null;
    }
  }

  /**
   * Removes the stored token.
   */
  async clear(): Promise<void> {
    const operationStart = performance.now();
    const operationId = `auth_clear_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    info('AUTH_FLOW: Token clear initiated', {
      operation: 'clearToken',
      operationId,
      timestamp: Date.now(),
    });

    try {
      // Get current token data before clearing for logging
      const currentData = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });

      const clearStart = performance.now();
      await this.storage.execute(async (tx) => {
        tx.remove(TOKEN_STORAGE_KEY);
      });
      const clearTime = Math.round(performance.now() - clearStart);
      const totalTime = Math.round(performance.now() - operationStart);

      info('AUTH_FLOW: Token cleared successfully', {
        operationId,
        success: true,
        timing: { total: totalTime, clear: clearTime },
        clearedTokenMetadata: currentData
          ? sanitizePayloadQuick({
              source: currentData.source,
              capturedAt: currentData.capturedAt,
              age: Date.now() - currentData.capturedAt,
              wasExpired: this.isExpired(currentData),
            })
          : null,
        hadToken: !!currentData,
      });
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);
      error('AUTH_FLOW: Token clear failed', {
        operationId,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
      });
    }
  }

  /**
   * Validates if a token string meets the expected format requirements.
   *
   * @param token - The token string to validate
   * @returns true if the token has valid format
   */
  isValid(token: string): boolean {
    return this.validator.validate(token);
  }

  /**
   * Get detailed authentication status.
   *
   * @returns Promise resolving to detailed authentication status
   */
  async getAuthStatus(): Promise<AuthStatus> {
    const operationStart = performance.now();
    const operationId = `auth_status_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    debug('AUTH_FLOW: Authentication status check initiated', {
      operation: 'getAuthStatus',
      operationId,
      timestamp: Date.now(),
    });

    try {
      const data = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });

      const totalTime = Math.round(performance.now() - operationStart);

      if (!data || !data.token) {
        info('AUTH_FLOW: Authentication status - NOT_AUTHENTICATED', {
          operationId,
          status: AuthStatus.NOT_AUTHENTICATED,
          reason: 'No token data found',
          timing: { total: totalTime },
        });
        return AuthStatus.NOT_AUTHENTICATED;
      }

      // Validate token format
      const isValidFormat = this.validator.validate(data.token);
      if (!isValidFormat) {
        warn('AUTH_FLOW: Authentication status - INVALID', {
          operationId,
          status: AuthStatus.INVALID,
          reason: 'Token format validation failed',
          tokenMetadata: sanitizePayloadQuick({
            source: data.source,
            capturedAt: data.capturedAt,
            tokenLength: data.token.length,
            tokenPreview: data.token.substring(0, 15) + '...',
          }),
          timing: { total: totalTime },
        });
        return AuthStatus.INVALID;
      }

      // Check expiry
      const isExpired = this.isExpired(data);
      if (isExpired) {
        const now = Date.now();
        const expiredBy = data.expiresAt ? now - data.expiresAt : 0;

        warn('AUTH_FLOW: Authentication status - EXPIRED', {
          operationId,
          status: AuthStatus.EXPIRED,
          reason: 'Token has expired',
          tokenMetadata: sanitizePayloadQuick({
            source: data.source,
            capturedAt: data.capturedAt,
            expiresAt: data.expiresAt,
            expiredBy: {
              milliseconds: expiredBy,
              minutes: Math.round(expiredBy / 1000 / 60),
              hours: Math.round(expiredBy / 1000 / 60 / 60),
            },
          }),
          timing: { total: totalTime },
        });
        return AuthStatus.EXPIRED;
      }

      // Token is valid and not expired
      const now = Date.now();
      const timeUntilExpiry = data.expiresAt ? data.expiresAt - now : 0;

      info('AUTH_FLOW: Authentication status - AUTHENTICATED', {
        operationId,
        status: AuthStatus.AUTHENTICATED,
        reason: 'Valid token found',
        tokenHealth: {
          source: data.source,
          age: {
            minutes: Math.round((now - data.capturedAt) / 1000 / 60),
            hours: Math.round((now - data.capturedAt) / 1000 / 60 / 60),
          },
          expiry: {
            minutesUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60),
            isNearExpiry: timeUntilExpiry < 60 * 60 * 1000, // Less than 1 hour
          },
        },
        timing: { total: totalTime },
      });

      return AuthStatus.AUTHENTICATED;
    } catch (err) {
      const errorTime = Math.round(performance.now() - operationStart);
      error('AUTH_FLOW: Authentication status check failed', {
        operationId,
        status: AuthStatus.NOT_AUTHENTICATED,
        reason: 'Error during status check',
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        timing: { total: errorTime },
      });
      return AuthStatus.NOT_AUTHENTICATED;
    }
  }

  /**
   * Check if there's any token (valid or invalid) in storage.
   *
   * @returns Promise resolving to true if any token exists
   */
  async hasToken(): Promise<boolean> {
    try {
      const data = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });
      return !!(data && data.token);
    } catch (err) {
      error('AuthManager.hasToken: Error checking token existence', { error: err });
      return false;
    }
  }

  /**
   * Checks if a token has exceeded its expiry time.
   */
  private isExpired(data: TokenData): boolean {
    return data.expiresAt ? Date.now() > data.expiresAt : false;
  }
}

/**
 * Singleton instance of the auth manager.
 *
 * @example
 * ```typescript
 * import { authManager } from './auth/manager';
 *
 * // Save a token
 * const success = await authManager.save('TripActions_abc123...', 'http-interceptor');
 *
 * // Retrieve the current token
 * const token = await authManager.get();
 * if (token) {
 *   headers.Authorization = `Bearer ${token}`;
 * }
 *
 * // Clear token on logout
 * await authManager.clear();
 * ```
 */
export const authManager = new AuthManager();

// For backward compatibility
export const tokenManager = authManager;
