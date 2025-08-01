/**
 * Transaction interface for storage operations
 * Provides isolated storage operations that can be committed or rolled back
 */
export interface Transaction {
  /**
   * Get a value from storage, checking pending writes first
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in the transaction
   */
  set(key: string, value: unknown): void;

  /**
   * Remove a key in the transaction
   */
  remove(key: string): void;

  /**
   * Increment a numeric value
   */
  increment(key: string): void;

  /**
   * Decrement a numeric value
   */
  decrement(key: string): void;

  /**
   * Commit all operations atomically
   */
  commit(): Promise<void>;

  /**
   * Rollback all pending operations
   */
  rollback(): void;

  /**
   * Get all pending operations (for debugging)
   */
  getOperations(): StorageOperation[];
}

/**
 * Transaction manager interface
 * Manages transaction lifecycle and provides transactional execution
 */
export interface TransactionManager {
  /**
   * Begin a new transaction
   */
  begin(): Transaction;

  /**
   * Execute operations within a transaction
   * Automatically commits on success, rolls back on failure
   */
  execute<T>(operation: (tx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * Storage operation types
 */
export interface StorageOperation {
  type: 'set' | 'remove' | 'increment' | 'decrement';
  key: string;
  value?: unknown;
}
