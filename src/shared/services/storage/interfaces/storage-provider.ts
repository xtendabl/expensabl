/**
 * Abstract storage provider interface
 * Allows different storage backends (Chrome, memory, etc.)
 */
export interface StorageProvider {
  /**
   * Get a value from storage
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set multiple key-value pairs
   */
  set(items: Record<string, unknown>): Promise<void>;

  /**
   * Remove multiple keys
   */
  remove(keys: string[]): Promise<void>;

  /**
   * Check if storage provider is available
   */
  isAvailable(): boolean;
}
