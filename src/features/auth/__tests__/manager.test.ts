import { AuthManager } from '../manager';
import { AuthStatus } from '../types';
import { TripActionsTokenValidator } from '../validators/token-validator';
import { MemoryStorageProvider } from '../../../shared/services/storage/providers/memory-storage';
import { StorageManager } from '../../../shared/services/storage/transaction/manager';

describe('AuthManager', () => {
  let authManager: AuthManager;
  let storageManager: StorageManager;
  let memoryProvider: MemoryStorageProvider;

  beforeEach(() => {
    memoryProvider = new MemoryStorageProvider();
    storageManager = new StorageManager(memoryProvider);
    authManager = new AuthManager(storageManager, new TripActionsTokenValidator());
  });

  afterEach(() => {
    memoryProvider.clear();
  });

  describe('save', () => {
    it('should save a valid token', async () => {
      const token = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      const result = await authManager.save(token, 'test-source');

      expect(result).toBe(true);

      const storedData = await storageManager.execute(async (tx) => {
        return await tx.get<any>('auth-token');
      });
      expect(storedData).toMatchObject({
        token,
        source: 'test-source',
      });
      expect(storedData.capturedAt).toBeDefined();
      expect(storedData.expiresAt).toBeDefined();
    });

    it('should reject invalid tokens', async () => {
      const invalidTokens = ['', 'invalid', 'Bearer_token', 'TripActions_short', null, undefined];

      for (const token of invalidTokens) {
        const result = await authManager.save(token as any, 'test-source');
        expect(result).toBe(false);
      }
    });

    it('should return false on storage error', async () => {
      jest.spyOn(storageManager, 'execute').mockRejectedValueOnce(new Error('Storage error'));

      const token = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      const result = await authManager.save(token, 'test-source');

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    const validToken = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';

    it('should retrieve a valid token', async () => {
      await authManager.save(validToken, 'test-source');
      const token = await authManager.get();

      expect(token).toBe(validToken);
    });

    it('should return null when no token exists', async () => {
      const token = await authManager.get();
      expect(token).toBeNull();
    });

    it('should return null for expired tokens', async () => {
      const expiredData = {
        token: validToken,
        source: 'test-source',
        capturedAt: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago
        expiresAt: Date.now() - 24 * 60 * 60 * 1000, // Expired 24 hours ago
      };

      await storageManager.execute(async (tx) => {
        tx.set('auth-token', expiredData);
      });
      const token = await authManager.get();

      expect(token).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      jest.spyOn(storageManager, 'execute').mockRejectedValueOnce(new Error('Storage error'));

      const token = await authManager.get();
      expect(token).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove stored token', async () => {
      const token = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      await authManager.save(token, 'test-source');

      await authManager.clear();

      const storedData = await storageManager.execute(async (tx) => {
        return await tx.get('auth-token');
      });
      expect(storedData).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      jest.spyOn(storageManager, 'execute').mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await expect(authManager.clear()).resolves.not.toThrow();
    });
  });

  describe('isValid', () => {
    it('should validate tokens using the validator', () => {
      const validToken = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      const invalidToken = 'Bearer_invalid';

      expect(authManager.isValid(validToken)).toBe(true);
      expect(authManager.isValid(invalidToken)).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    const validToken = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';

    it('should return AUTHENTICATED for valid token', async () => {
      await authManager.save(validToken, 'test-source');
      const status = await authManager.getAuthStatus();

      expect(status).toBe(AuthStatus.AUTHENTICATED);
    });

    it('should return NOT_AUTHENTICATED when no token exists', async () => {
      const status = await authManager.getAuthStatus();
      expect(status).toBe(AuthStatus.NOT_AUTHENTICATED);
    });

    it('should return EXPIRED for expired tokens', async () => {
      const expiredData = {
        token: validToken,
        source: 'test-source',
        capturedAt: Date.now() - 48 * 60 * 60 * 1000,
        expiresAt: Date.now() - 24 * 60 * 60 * 1000,
      };

      await storageManager.execute(async (tx) => {
        tx.set('auth-token', expiredData);
      });
      const status = await authManager.getAuthStatus();

      expect(status).toBe(AuthStatus.EXPIRED);
    });

    it('should return INVALID for invalid token format', async () => {
      const invalidData = {
        token: 'Bearer_invalid',
        source: 'test-source',
        capturedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await storageManager.execute(async (tx) => {
        tx.set('auth-token', invalidData);
      });
      const status = await authManager.getAuthStatus();

      expect(status).toBe(AuthStatus.INVALID);
    });

    it('should handle storage errors', async () => {
      jest.spyOn(storageManager, 'execute').mockRejectedValueOnce(new Error('Storage error'));

      const status = await authManager.getAuthStatus();
      expect(status).toBe(AuthStatus.NOT_AUTHENTICATED);
    });
  });

  describe('hasToken', () => {
    it('should return true when token exists', async () => {
      const token = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      await authManager.save(token, 'test-source');

      const hasToken = await authManager.hasToken();
      expect(hasToken).toBe(true);
    });

    it('should return false when no token exists', async () => {
      const hasToken = await authManager.hasToken();
      expect(hasToken).toBe(false);
    });

    it('should return true even for expired tokens', async () => {
      const expiredData = {
        token: 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890',
        source: 'test-source',
        capturedAt: Date.now() - 48 * 60 * 60 * 1000,
        expiresAt: Date.now() - 24 * 60 * 60 * 1000,
      };

      await storageManager.execute(async (tx) => {
        tx.set('auth-token', expiredData);
      });
      const hasToken = await authManager.hasToken();

      expect(hasToken).toBe(true);
    });

    it('should handle storage errors', async () => {
      jest.spyOn(storageManager, 'execute').mockRejectedValueOnce(new Error('Storage error'));

      const hasToken = await authManager.hasToken();
      expect(hasToken).toBe(false);
    });
  });
});
