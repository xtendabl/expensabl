/**
 * Read cache for storage operations
 * Manages cached read values with proper lifecycle
 */
export class ReadCache {
  private cache: Map<string, unknown> = new Map();

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: unknown): void {
    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries based on pending operations
   */
  invalidateKeys(keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache size (for debugging/monitoring)
   */
  size(): number {
    return this.cache.size;
  }
}
