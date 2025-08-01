import { ChromeStorageProvider } from '../chrome-storage';

// Mock Chrome API with promises
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
};

// Mock global chrome object
(global as any).chrome = {
  storage: mockChromeStorage,
};

describe('ChromeStorageProvider', () => {
  let provider: ChromeStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ChromeStorageProvider();
  });

  describe('constructor', () => {
    it('should initialize with Chrome storage available', () => {
      expect(provider).toBeInstanceOf(ChromeStorageProvider);
    });

    it('should handle missing Chrome API gracefully', () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;

      expect(() => new ChromeStorageProvider()).not.toThrow();

      (global as any).chrome = originalChrome;
    });
  });

  describe('isAvailable', () => {
    it('should return true when Chrome storage API is available', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false when Chrome API is not available', () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;

      const tempProvider = new ChromeStorageProvider();
      expect(tempProvider.isAvailable()).toBe(false);

      (global as any).chrome = originalChrome;
    });

    it('should return false when Chrome storage is not available', () => {
      const originalStorage = (global as any).chrome.storage;
      delete (global as any).chrome.storage;

      const tempProvider = new ChromeStorageProvider();
      expect(tempProvider.isAvailable()).toBe(false);

      (global as any).chrome.storage = originalStorage;
    });
  });

  describe('get', () => {
    it('should retrieve value from Chrome storage', async () => {
      const mockValue = { testKey: 'testValue' };
      mockChromeStorage.local.get.mockResolvedValue(mockValue);

      const result = await provider.get('testKey');

      expect(result).toBe('testValue');
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith('testKey');
    });

    it('should return null for non-existent keys', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});

      const result = await provider.get('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should throw error when Chrome storage is not available', async () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;

      const tempProvider = new ChromeStorageProvider();

      await expect(tempProvider.get('testKey')).rejects.toThrow('Chrome storage API not available');

      (global as any).chrome = originalChrome;
    });
  });

  describe('set', () => {
    it('should store items in Chrome storage', async () => {
      mockChromeStorage.local.set.mockResolvedValue(undefined);

      const items = { testKey: 'testValue', anotherKey: 'anotherValue' };
      await provider.set(items);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(items);
    });

    it('should handle complex data types', async () => {
      const complexValue = { nested: { data: [1, 2, 3] }, date: new Date().toISOString() };
      const items = { complexKey: complexValue };

      mockChromeStorage.local.set.mockResolvedValue(undefined);

      await provider.set(items);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(items);
    });

    it('should throw error when Chrome storage is not available', async () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;

      const tempProvider = new ChromeStorageProvider();

      await expect(tempProvider.set({ key: 'value' })).rejects.toThrow(
        'Chrome storage API not available'
      );

      (global as any).chrome = originalChrome;
    });
  });

  describe('remove', () => {
    it('should remove keys from Chrome storage', async () => {
      mockChromeStorage.local.remove.mockResolvedValue(undefined);

      const keysToRemove = ['key1', 'key2'];
      await provider.remove(keysToRemove);

      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith(keysToRemove);
    });

    it('should handle removal of single key', async () => {
      mockChromeStorage.local.remove.mockResolvedValue(undefined);

      await provider.remove(['singleKey']);

      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith(['singleKey']);
    });

    it('should throw error when Chrome storage is not available', async () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;

      const tempProvider = new ChromeStorageProvider();

      await expect(tempProvider.remove(['key1'])).rejects.toThrow(
        'Chrome storage API not available'
      );

      (global as any).chrome = originalChrome;
    });
  });

  describe('error handling', () => {
    it('should handle Chrome API errors', async () => {
      const storageError = new Error('Chrome API error');
      mockChromeStorage.local.get.mockRejectedValue(storageError);

      await expect(provider.get('testKey')).rejects.toThrow('Chrome API error');
    });

    it('should handle null responses gracefully', async () => {
      mockChromeStorage.local.get.mockResolvedValue(null);

      const result = await provider.get('testKey');
      expect(result).toBeNull();
    });
  });
});
