import { StorageProvider } from '../interfaces/storage-provider';

/**
 * Chrome extension storage provider
 * Implements StorageProvider using Chrome's local storage API
 */
export class ChromeStorageProvider implements StorageProvider {
  /**
   * Check if Chrome storage API is available
   */
  isAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage?.local;
  }

  /**
   * Get a value from Chrome storage
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      throw new Error('Chrome storage API not available');
    }

    const result = await chrome.storage.local.get(key);
    return result && typeof result === 'object' && key in result ? result[key] : null;
  }

  /**
   * Set multiple key-value pairs in Chrome storage
   */
  async set(items: Record<string, unknown>): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Chrome storage API not available');
    }

    await chrome.storage.local.set(items);
  }

  /**
   * Remove multiple keys from Chrome storage
   */
  async remove(keys: string[]): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Chrome storage API not available');
    }

    await chrome.storage.local.remove(keys);
  }
}

// Export singleton instance
export const chromeStorageProvider = new ChromeStorageProvider();
