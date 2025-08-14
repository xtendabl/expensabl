import {
  PayloadSanitizer,
  sanitizePayload,
  sanitizePayloadQuick,
  createOperationSanitizer,
} from '../payload-sanitizer';

describe('PayloadSanitizer', () => {
  let sanitizer: PayloadSanitizer;

  beforeEach(() => {
    sanitizer = new PayloadSanitizer();
  });

  describe('basic sanitization', () => {
    it('should redact sensitive fields', () => {
      const payload = {
        username: 'john_doe',
        password: 'secret123',
        token: 'abc123',
        email: 'john@example.com',
      };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        username: 'john_doe',
        password: '[REDACTED]',
        token: '[REDACTED]',
        email: 'john@example.com',
      });
      expect(result.metrics.redactedFields).toBe(2);
    });

    it('should handle nested objects', () => {
      const payload = {
        user: {
          name: 'John',
          auth: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
        data: {
          amount: 100,
        },
      };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        user: {
          name: 'John',
          auth: '[REDACTED]',
        },
        data: {
          amount: 100,
        },
      });
      expect(result.metrics.redactedFields).toBe(1);
    });

    it('should handle arrays', () => {
      const payload = {
        users: [
          { name: 'John', password: 'secret1' },
          { name: 'Jane', password: 'secret2' },
        ],
      };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        users: [
          { name: 'John', password: '[REDACTED]' },
          { name: 'Jane', password: '[REDACTED]' },
        ],
      });
      expect(result.metrics.redactedFields).toBe(2);
    });
  });

  describe('special object types', () => {
    it('should handle File objects', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const payload = { document: file };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        document: {
          '[FILE_METADATA]': {
            name: 'test.txt',
            size: 7,
            type: 'text/plain',
            lastModified: expect.any(Number),
          },
        },
      });
      expect(result.metrics.redactedFields).toBe(1);
    });

    it('should handle FormData', () => {
      const formData = new FormData();
      formData.append('username', 'john');
      formData.append('password', 'secret');
      formData.append('file', new File(['content'], 'test.txt'));

      const result = sanitizer.sanitize(formData);

      expect(result.sanitized).toEqual({
        '[FORM_DATA]': {
          username: 'john',
          password: '[REDACTED]',
          file: {
            '[FILE_METADATA]': {
              name: 'test.txt',
              size: 7,
              type: '',
              lastModified: expect.any(Number),
            },
          },
        },
      });
      expect(result.metrics.redactedFields).toBe(3);
    });

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const payload = { createdAt: date };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        createdAt: '2023-01-01T00:00:00.000Z',
      });
    });

    it('should handle binary data', () => {
      const buffer = new ArrayBuffer(8);
      const payload = { data: buffer };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        data: {
          '[BINARY_METADATA]': {
            type: 'ArrayBuffer',
            size: 8,
          },
        },
      });
      expect(result.metrics.redactedFields).toBe(1);
    });
  });

  describe('string truncation', () => {
    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000);
      const payload = { description: longString };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        description: `${'a'.repeat(1000)}... [truncated, total length: 2000]`,
      });
    });
  });

  describe('circular references', () => {
    it('should handle circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      const result = sanitizer.sanitize(obj);

      expect(result.sanitized).toEqual({
        name: 'test',
        self: '[CIRCULAR_REFERENCE]',
      });
    });
  });

  describe('max depth protection', () => {
    it('should prevent infinite recursion with max depth', () => {
      const sanitizerWithLowDepth = new PayloadSanitizer({ maxDepth: 2 });

      const deepObj = {
        level1: {
          level2: {
            level3: {
              level4: 'too deep',
            },
          },
        },
      };

      const result = sanitizerWithLowDepth.sanitize(deepObj);

      expect(result.sanitized).toEqual({
        level1: {
          level2: {
            level3: '[MAX_DEPTH_EXCEEDED]',
          },
        },
      });
    });
  });
  describe('custom sensitive fields', () => {
    it('should use custom sensitive field patterns', () => {
      const customSanitizer = new PayloadSanitizer({
        customSensitiveFields: ['customSecret', 'internalId'],
      });

      const payload = {
        name: 'John',
        customSecret: 'secret',
        internalId: '12345',
        publicData: 'visible',
      };

      const result = customSanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        name: 'John',
        customSecret: '[REDACTED]',
        internalId: '[REDACTED]',
        publicData: 'visible',
      });
      expect(result.metrics.redactedFields).toBe(2);
    });
  });

  describe('performance metrics', () => {
    it('should provide performance metrics', () => {
      const payload = { name: 'John', password: 'secret' };

      const result = sanitizer.sanitize(payload);

      expect(result.metrics).toEqual({
        sanitizationTimeMs: expect.any(Number),
        redactedFields: 1,
        originalSize: expect.any(Number),
        sanitizedSize: expect.any(Number),
      });
      expect(result.metrics.sanitizationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.originalSize).toBeGreaterThan(0);
      expect(result.metrics.sanitizedSize).toBeGreaterThan(0);
    });
  });

  describe('convenience functions', () => {
    it('should work with sanitizePayload function', () => {
      const payload = { name: 'John', password: 'secret' };

      const result = sanitizePayload(payload);

      expect(result.sanitized).toEqual({
        name: 'John',
        password: '[REDACTED]',
      });
      expect(result.metrics.redactedFields).toBe(1);
    });

    it('should work with sanitizePayloadQuick function', () => {
      const payload = { name: 'John', password: 'secret' };

      const result = sanitizePayloadQuick(payload);

      expect(result).toEqual({
        name: 'John',
        password: '[REDACTED]',
      });
    });

    it('should create operation-specific sanitizers', () => {
      const expenseSanitizer = createOperationSanitizer('expense');
      const payload = {
        amount: 100,
        merchant_name: 'Store',
        password: 'secret',
      };

      const result = expenseSanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        amount: 100,
        merchant_name: '[REDACTED]',
        password: '[REDACTED]',
      });
      expect(result.metrics.redactedFields).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined', () => {
      const payload = { a: null, b: undefined, c: 'value' };

      const result = sanitizer.sanitize(payload);

      expect(result.sanitized).toEqual({
        a: null,
        b: undefined,
        c: 'value',
      });
    });

    it('should handle primitives', () => {
      expect(sanitizer.sanitize('string').sanitized).toBe('string');
      expect(sanitizer.sanitize(123).sanitized).toBe(123);
      expect(sanitizer.sanitize(true).sanitized).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      expect(sanitizer.sanitize({}).sanitized).toEqual({});
      expect(sanitizer.sanitize([]).sanitized).toEqual([]);
    });
  });
});
