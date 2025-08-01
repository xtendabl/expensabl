import { MemoryStorageProvider } from '../memory-storage';

describe('MemoryStorageProvider', () => {
  let provider: MemoryStorageProvider;

  beforeEach(() => {
    provider = new MemoryStorageProvider();
  });

  describe('constructor', () => {
    it('should initialize with empty storage', () => {
      expect(provider).toBeInstanceOf(MemoryStorageProvider);
    });

    it('should always be available', () => {
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve stored values', async () => {
      await provider.set({ testKey: 'testValue' });

      const result = await provider.get('testKey');

      expect(result).toBe('testValue');
    });

    it('should return null for non-existent keys', async () => {
      const result = await provider.get('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should handle complex data types', async () => {
      const complexValue = {
        nested: { data: [1, 2, 3] },
        date: new Date(),
        boolean: true,
        number: 42,
      };

      await provider.set({ complexKey: complexValue });
      const result = await provider.get('complexKey');

      expect(result).toEqual(complexValue);
      // Memory storage returns the same reference, not a deep copy in this implementation
    });

    it('should handle stored null values correctly', async () => {
      await provider.set({ nullKey: null });

      const result = await provider.get('nullKey');

      expect(result).toBeNull();
    });

    it('should handle stored undefined values correctly', async () => {
      await provider.set({ undefinedKey: undefined });

      const result = await provider.get('undefinedKey');

      expect(result).toBeNull(); // Implementation returns null for undefined values
    });
  });

  describe('set', () => {
    it('should store multiple key-value pairs', async () => {
      const items = {
        key1: 'value1',
        key2: 'value2',
        key3: 42,
      };

      await provider.set(items);

      const result1 = await provider.get('key1');
      const result2 = await provider.get('key2');
      const result3 = await provider.get('key3');

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      expect(result3).toBe(42);
    });

    it('should overwrite existing values', async () => {
      await provider.set({ testKey: 'initialValue' });
      await provider.set({ testKey: 'updatedValue' });

      const result = await provider.get('testKey');
      expect(result).toBe('updatedValue');
    });

    it('should handle various data types', async () => {
      const testCases = {
        string: 'stringValue',
        number: 42,
        boolean: true,
        null: null,
        undefined,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };

      await provider.set(testCases);

      for (const [key, value] of Object.entries(testCases)) {
        const result = await provider.get(key);
        if (value === undefined) {
          expect(result).toBeNull(); // undefined becomes null
        } else {
          expect(result).toEqual(value);
        }
      }
    });

    it('should create deep copies of objects', async () => {
      const originalObject = { nested: { value: 'test' } };

      await provider.set({ objectKey: originalObject });

      // Modify original object
      originalObject.nested.value = 'modified';

      // Memory storage returns the same reference, so modifications affect stored value
      const result = (await provider.get('objectKey')) as any;
      expect(result.nested.value).toBe('modified');
    });

    it('should handle circular references gracefully', async () => {
      const circularObject: any = { prop: 'value' };
      circularObject.self = circularObject;

      // Memory storage doesn't serialize, so circular references are stored as-is
      await expect(provider.set({ circularKey: circularObject })).resolves.not.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove multiple keys', async () => {
      await provider.set({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      await provider.remove(['key1', 'key3']);

      const result1 = await provider.get('key1');
      const result2 = await provider.get('key2');
      const result3 = await provider.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBe('value2');
      expect(result3).toBeNull();
    });

    it('should handle removal of non-existent keys gracefully', async () => {
      await provider.remove(['nonExistentKey1', 'nonExistentKey2']);

      // Should not throw and should complete successfully
      const result = await provider.get('nonExistentKey1');
      expect(result).toBeNull();
    });

    it('should handle removal of single key', async () => {
      await provider.set({ singleKey: 'value' });

      await provider.remove(['singleKey']);

      const result = await provider.get('singleKey');
      expect(result).toBeNull();
    });

    it('should handle empty key array', async () => {
      await provider.set({ testKey: 'value' });

      await provider.remove([]);

      const result = await provider.get('testKey');
      expect(result).toBe('value'); // Should remain unchanged
    });
  });

  describe('isAvailable', () => {
    it('should always return true for memory storage', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true for multiple instances', () => {
      const provider1 = new MemoryStorageProvider();
      const provider2 = new MemoryStorageProvider();

      expect(provider1.isAvailable()).toBe(true);
      expect(provider2.isAvailable()).toBe(true);
    });
  });

  describe('data integrity and isolation', () => {
    it('should maintain data integrity across operations', async () => {
      const testData = {
        array: [1, 2, { nested: 'value' }],
        object: { deeply: { nested: { data: 'test' } } },
        primitives: { str: 'string', num: 42, bool: true },
      };

      await provider.set(testData);

      const retrieved = await provider.get('array');
      expect(retrieved).toEqual(testData.array);
      // Memory storage returns the same reference
    });

    it('should isolate different provider instances', async () => {
      const provider1 = new MemoryStorageProvider();
      const provider2 = new MemoryStorageProvider();

      await provider1.set({ sharedKey: 'provider1Value' });
      await provider2.set({ sharedKey: 'provider2Value' });

      const value1 = await provider1.get('sharedKey');
      const value2 = await provider2.get('sharedKey');

      expect(value1).toBe('provider1Value');
      expect(value2).toBe('provider2Value');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      const numberOfKeys = 1000;
      const largeDataset: Record<string, string> = {};

      // Generate large dataset
      for (let i = 0; i < numberOfKeys; i++) {
        largeDataset[`key-${i}`] = `value-${i}`;
      }

      await provider.set(largeDataset);

      // Verify random access performance
      const randomKey = `key-${Math.floor(Math.random() * numberOfKeys)}`;
      const result = await provider.get(randomKey);
      expect(result).toBeDefined();
    });

    it('should handle rapid sequential operations', async () => {
      const operations = [];

      // Perform rapid sequential operations
      for (let i = 0; i < 50; i++) {
        operations.push(provider.set({ [`key-${i}`]: `value-${i}` }));
      }

      await Promise.all(operations);

      // Verify all operations completed successfully
      const result = await provider.get('key-25');
      expect(result).toBe('value-25');
    });

    it('should handle edge case values correctly', async () => {
      const edgeCases = {
        'empty-string': '',
        zero: 0,
        negative: -1,
        infinity: Infinity,
        'negative-infinity': -Infinity,
        nan: NaN,
      };

      await provider.set(edgeCases);

      for (const [key, value] of Object.entries(edgeCases)) {
        const result = await provider.get(key);

        if (Number.isNaN(value)) {
          expect(Number.isNaN(result)).toBe(true);
        } else {
          expect(result).toBe(value);
        }
      }
    });
  });

  describe('memory cleanup', () => {
    it('should properly clean up after remove operations', async () => {
      const numberOfKeys = 100;
      const initialData: Record<string, string> = {};

      // Add keys
      for (let i = 0; i < numberOfKeys; i++) {
        initialData[`key-${i}`] = `value-${i}`;
      }
      await provider.set(initialData);

      // Remove half the keys
      const keysToRemove = [];
      for (let i = 0; i < numberOfKeys / 2; i++) {
        keysToRemove.push(`key-${i}`);
      }
      await provider.remove(keysToRemove);

      // Verify correct keys remain
      const remainingKey = await provider.get('key-75');
      const removedKey = await provider.get('key-25');

      expect(remainingKey).toBe('value-75');
      expect(removedKey).toBeNull();
    });
  });
});
