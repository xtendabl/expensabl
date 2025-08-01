import { StorageManager } from '../../shared/services/storage/transaction/manager';
import { chromeStorageProvider } from '../../shared/services/storage/providers/chrome-storage';

const storageManager = new StorageManager(chromeStorageProvider);
import { debug, info, warn, error } from '../../shared/services/logger/chrome-logger-setup';
import { AuthStatus, TokenData, TokenValidator } from './types';
import { TripActionsTokenValidator } from './validators/token-validator';

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
    info('AuthManager.save: Attempting to save token', {
      source,
      tokenPreview: token ? `${token.substring(0, 15)}...` : 'empty',
    });

    if (!this.validator.validate(token)) {
      warn('AuthManager.save: Invalid token format', {
        source,
        tokenLength: token?.length || 0,
        hasPrefix: token?.startsWith(this.validator.getPrefix()) || false,
      });
      return false;
    }

    try {
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
      info('AuthManager.save: Token saved successfully', { source });
      return true;
    } catch (err) {
      error('AuthManager.save: Failed to save token', {
        error: err,
        source,
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
    debug('AuthManager.get: Retrieving token');

    try {
      const data = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });

      if (!data) {
        debug('AuthManager.get: No token found');
        return null;
      }

      if (this.isExpired(data)) {
        warn('AuthManager.get: Token has expired');
        return null;
      }

      debug('AuthManager.get: Token retrieved', {
        source: data.source,
        age: `${Math.round((Date.now() - data.capturedAt) / 1000 / 60)} minutes`,
      });

      return data.token;
    } catch (err) {
      error('AuthManager.get: Failed to retrieve token', { error: err });
      return null;
    }
  }

  /**
   * Removes the stored token.
   */
  async clear(): Promise<void> {
    info('AuthManager.clear: Clearing stored token');

    try {
      await this.storage.execute(async (tx) => {
        tx.remove(TOKEN_STORAGE_KEY);
      });
    } catch (err) {
      error('AuthManager.clear: Failed to clear token', { error: err });
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
    debug('AuthManager.getAuthStatus: Getting auth status');

    try {
      const data = await this.storage.execute(async (tx) => {
        return await tx.get<TokenData>(TOKEN_STORAGE_KEY);
      });

      if (!data || !data.token) {
        return AuthStatus.NOT_AUTHENTICATED;
      }

      if (!this.validator.validate(data.token)) {
        return AuthStatus.INVALID;
      }

      if (this.isExpired(data)) {
        return AuthStatus.EXPIRED;
      }

      return AuthStatus.AUTHENTICATED;
    } catch (err) {
      error('AuthManager.getAuthStatus: Error checking auth status', { error: err });
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
