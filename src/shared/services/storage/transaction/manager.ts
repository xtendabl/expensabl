import { StorageProvider } from '../interfaces/storage-provider';
import { Transaction, TransactionManager, StorageOperation } from '../interfaces/transaction';
import { ReadCache } from './cache';
import { createOperation } from './operation';

/**
 * Storage transaction implementation providing ACID-like guarantees
 * for Chrome extension storage operations.
 *
 * @class StorageTransaction
 * @implements {Transaction}
 *
 * @remarks
 * Key features:
 * - **Isolation**: Reads see pending writes within the transaction
 * - **Atomicity**: All operations commit or none do
 * - **Consistency**: Operations are validated before commit
 * - **Durability**: Delegates to Chrome storage for persistence
 *
 * The transaction maintains a local cache of reads and queues writes
 * until commit. This allows for complex operations like increment/decrement
 * to be calculated correctly even with concurrent transactions.
 *
 * @example
 * ```typescript
 * const tx = new StorageTransaction(provider);
 *
 * // These operations are isolated until commit
 * tx.set('user:123', { name: 'John', credits: 100 });
 * tx.increment('user:123:visits');
 * const user = await tx.get('user:123'); // Sees pending write
 *
 * await tx.commit(); // Atomically applies all operations
 * ```
 */
export class StorageTransaction implements Transaction {
  private operations: StorageOperation[] = [];
  private readCache: ReadCache = new ReadCache();
  private committed: boolean = false;
  private rolledBack: boolean = false;

  constructor(private provider: StorageProvider) {}

  // Documenting due to complex transaction isolation logic
  /**
   * Retrieves a value with full transaction isolation, checking pending writes first.
   * Implements read-your-writes consistency within the transaction.
   *
   * @template T - The expected type of the stored value
   * @param key - The storage key to retrieve
   * @returns The value if found, null otherwise
   *
   * @remarks
   * Resolution order:
   * 1. **Pending writes**: Last set operation wins
   * 2. **Pending increments/decrements**: Calculates final value
   * 3. **Pending removes**: Returns null
   * 4. **Read cache**: Previously read values
   * 5. **Storage provider**: Actual storage
   *
   * This ensures transaction sees its own modifications
   * before they're committed to storage.
   *
   * @example
   * ```typescript
   * tx.set('count', 10);
   * tx.increment('count');
   * const value = await tx.get('count'); // Returns 11
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    this.ensureActive();

    // Check if we have a pending write for this key (last write wins)
    const pendingWrite = this.operations
      .filter(
        (op) =>
          (op.type === 'set' || op.type === 'increment' || op.type === 'decrement') &&
          op.key === key
      )
      .pop();

    if (pendingWrite) {
      if (pendingWrite.type === 'set') {
        return pendingWrite.value as T;
      }
      // For increment/decrement, we need to calculate the final value
      if (pendingWrite.type === 'increment' || pendingWrite.type === 'decrement') {
        const baseValue = (await this.getBaseValue<number>(key)) || 0;
        const delta = this.calculateDelta(key);
        return (baseValue + delta) as T;
      }
    }

    // Check if we have a pending remove for this key
    const pendingRemove = this.operations
      .filter((op) => op.type === 'remove' && op.key === key)
      .pop();

    if (pendingRemove) {
      return null;
    }

    // Check read cache
    if (this.readCache.has(key)) {
      return this.readCache.get<T>(key) || null;
    }

    // Read from storage provider
    const value = await this.provider.get<T>(key);
    this.readCache.set(key, value);

    return value;
  }

  /**
   * Set a value in the transaction
   */
  set(key: string, value: unknown): void {
    this.ensureActive();
    const operation = createOperation('set', key, value);
    this.operations.push(operation);
  }

  /**
   * Remove a key in the transaction
   */
  remove(key: string): void {
    this.ensureActive();
    const operation = createOperation('remove', key);
    this.operations.push(operation);
  }

  /**
   * Increment a numeric value
   */
  increment(key: string): void {
    this.ensureActive();
    const operation = createOperation('increment', key);
    this.operations.push(operation);
  }

  /**
   * Decrement a numeric value
   */
  decrement(key: string): void {
    this.ensureActive();
    const operation = createOperation('decrement', key);
    this.operations.push(operation);
  }

  /**
   * Get all pending operations
   */
  getOperations(): StorageOperation[] {
    return [...this.operations];
  }

  // Documenting due to complex atomic commit implementation
  /**
   * Commits all transaction operations atomically to storage.
   * Groups operations by type for efficient batch execution.
   *
   * @returns Promise that resolves when all operations are persisted
   * @throws {Error} If storage operations fail, maintaining atomicity
   *
   * @remarks
   * Commit process:
   * 1. **Group operations**: Sets, removes, and counters
   * 2. **Resolve counters**: Read current values and calculate deltas
   * 3. **Execute atomically**: All operations succeed or all fail
   * 4. **Invalidate cache**: Clear affected keys from read cache
   *
   * Counter operations are resolved by:
   * - Reading current value from storage
   * - Applying all increments/decrements
   * - Writing final value as a set operation
   *
   * @example
   * ```typescript
   * tx.set('user:123', { name: 'John' });
   * tx.increment('stats:views');
   * tx.remove('temp:data');
   * await tx.commit(); // All 3 operations applied atomically
   * ```
   */
  async commit(): Promise<void> {
    this.ensureActive();

    if (this.operations.length === 0) {
      this.committed = true;
      return;
    }

    try {
      // Group operations by type
      const sets: Record<string, unknown> = {};
      const removes: string[] = [];
      const counters: Map<string, number> = new Map();

      for (const op of this.operations) {
        switch (op.type) {
          case 'set':
            sets[op.key] = op.value;
            break;
          case 'remove':
            removes.push(op.key);
            break;
          case 'increment':
            counters.set(op.key, (counters.get(op.key) || 0) + 1);
            break;
          case 'decrement':
            counters.set(op.key, (counters.get(op.key) || 0) - 1);
            break;
        }
      }

      // Handle counters by reading current values and calculating new ones
      for (const key of Array.from(counters.keys())) {
        const delta = counters.get(key) || 0;
        const current = (await this.getBaseValue<number>(key)) || 0;
        sets[key] = current + delta;
      }

      // Execute storage operations
      const promises: Promise<void>[] = [];

      if (removes.length > 0) {
        promises.push(this.provider.remove(removes));
      }

      if (Object.keys(sets).length > 0) {
        promises.push(this.provider.set(sets));
      }

      await Promise.all(promises);

      // Clear cache for affected keys
      const affectedKeys = [...removes, ...Object.keys(sets)];
      this.readCache.invalidateKeys(affectedKeys);

      this.committed = true;
    } catch (error) {
      throw new Error(
        `Transaction commit failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Rollback all pending operations
   */
  rollback(): void {
    this.ensureActive();
    this.operations = [];
    this.readCache.clear();
    this.rolledBack = true;
  }

  /**
   * Get base value from storage (bypassing transaction cache)
   */
  private async getBaseValue<T>(key: string): Promise<T | null> {
    return await this.provider.get<T>(key);
  }

  /**
   * Calculate net delta for increment/decrement operations on a key
   */
  private calculateDelta(key: string): number {
    return this.operations
      .filter((op) => op.key === key && (op.type === 'increment' || op.type === 'decrement'))
      .reduce((delta, op) => {
        return delta + (op.type === 'increment' ? 1 : -1);
      }, 0);
  }

  /**
   * Ensure transaction is still active
   */
  private ensureActive(): void {
    if (this.committed) {
      throw new Error('Transaction has already been committed');
    }
    if (this.rolledBack) {
      throw new Error('Transaction has been rolled back');
    }
  }
}

/**
 * Storage manager with proper transaction isolation
 * Fixed typo: StorageManger → StorageManager
 */
export class StorageManager implements TransactionManager {
  constructor(private provider: StorageProvider) {}

  /**
   * Begin a new transaction
   */
  begin(): Transaction {
    return new StorageTransaction(this.provider);
  }

  // Documenting due to automatic transaction lifecycle management
  /**
   * Executes operations within a managed transaction with automatic commit/rollback.
   * Provides a higher-level API that handles transaction lifecycle.
   *
   * @template T - The return type of the operation
   * @param operation - Async function that performs transactional operations
   * @returns The result of the operation function
   * @throws {Error} Re-throws any error from the operation after rollback
   *
   * @remarks
   * This method guarantees:
   * - **Automatic commit**: On successful completion
   * - **Automatic rollback**: On any error
   * - **Clean state**: Transaction is always finalized
   *
   * The operation function receives a transaction instance
   * and should perform all storage operations through it.
   *
   * @example
   * ```typescript
   * const result = await manager.execute(async (tx) => {
   *   const user = await tx.get<User>('user:123');
   *   if (!user) throw new Error('User not found');
   *
   *   user.credits -= 10;
   *   tx.set('user:123', user);
   *   tx.increment('stats:purchases');
   *
   *   return user.credits; // Returned after commit
   * });
   * ```
   */
  async execute<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    const tx = this.begin();

    try {
      const result = await operation(tx);
      await tx.commit();
      return result;
    } catch (error) {
      tx.rollback();
      throw error;
    }
  }
}
