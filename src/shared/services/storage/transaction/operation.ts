import { StorageOperation } from '../interfaces/transaction';

/**
 * Validates storage operation data
 */
export function validateOperation(operation: StorageOperation): void {
  if (!operation.key || typeof operation.key !== 'string') {
    throw new Error('Operation key must be a non-empty string');
  }

  if (!['set', 'remove', 'increment', 'decrement'].includes(operation.type)) {
    throw new Error(`Invalid operation type: ${operation.type}`);
  }

  if (operation.type === 'set' && operation.value === undefined) {
    throw new Error('Set operation requires a value');
  }
}

/**
 * Creates a validated storage operation
 */
export function createOperation(
  type: StorageOperation['type'],
  key: string,
  value?: unknown
): StorageOperation {
  const operation: StorageOperation = { type, key, value };
  validateOperation(operation);
  return operation;
}
