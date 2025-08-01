import { StorageProvider } from '../interfaces/storage-provider';

/**
 * In-memory storage provider for testing and fallback
 * Implements StorageProvider using a Map for data storage
 */
export class MemoryStorageProvider implements StorageProvider {
  private data: Map<string, unknown> = new Map();

  /**
   * Memory storage is always available
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get a value from memory storage
   */
  async get<T>(key: string): Promise<T | null> {
    const value = this.data.get(key);
    return value !== undefined ? (value as T) : null;
  }

  /**
   * Set multiple key-value pairs in memory storage
   */
  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      this.data.set(key, value);
    }
  }

  /**
   * Remove multiple keys from memory storage
   */
  async remove(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.data.delete(key);
    }
  }

  /**
   * Clear all data (testing utility)
   */
  clear(): void {
    this.data.clear();
  }
}

// Export singleton instance
export const memoryStorageProvider = new MemoryStorageProvider();
