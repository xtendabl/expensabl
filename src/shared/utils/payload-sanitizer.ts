/**
 * Payload sanitization utilities for secure debug logging.
 * Removes or redacts sensitive data while preserving structure for debugging.
 */

export interface SanitizationOptions {
  /** Maximum depth to traverse nested objects */
  maxDepth?: number;
  /** Maximum string length before truncation */
  maxStringLength?: number;
  /** Custom sensitive field patterns */
  customSensitiveFields?: string[];
  /** Whether to include metadata for files/binary data */
  includeFileMetadata?: boolean;
}

export interface SanitizationResult {
  /** Sanitized payload */
  sanitized: unknown;
  /** Performance metrics */
  metrics: {
    /** Time taken to sanitize in milliseconds */
    sanitizationTimeMs: number;
    /** Number of fields redacted */
    redactedFields: number;
    /** Original payload size estimate */
    originalSize: number;
    /** Sanitized payload size estimate */
    sanitizedSize: number;
  };
}

/**
 * Default sensitive field patterns (case-insensitive)
 */
const DEFAULT_SENSITIVE_PATTERNS = [
  // Authentication & Authorization
  'password',
  'passwd',
  'pwd',
  'token',
  'auth',
  'authorization',
  'bearer',
  'apikey',
  'api_key',
  'secret',
  'key',
  'credential',
  'session',
  'cookie',

  // Personal Information
  'ssn',
  'social_security',
  'tax_id',
  'passport',
  'license',
  'credit_card',
  'creditcard',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'account_number',
  'routing_number',
  'iban',
  'swift',

  // Potentially Sensitive Business Data
  'salary',
  'wage',
  'compensation',
  'bank_account',
  'payment_method',
];

/**
 * PayloadSanitizer class for secure logging of request/response data
 */
export class PayloadSanitizer {
  private sensitivePatterns: RegExp[];
  private options: Required<SanitizationOptions>;

  constructor(options: SanitizationOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 10,
      maxStringLength: options.maxStringLength ?? 1000,
      customSensitiveFields: options.customSensitiveFields ?? [],
      includeFileMetadata: options.includeFileMetadata ?? true,
    };

    // Combine default and custom sensitive patterns
    const allPatterns = [...DEFAULT_SENSITIVE_PATTERNS, ...this.options.customSensitiveFields];

    // Create case-insensitive regex patterns
    this.sensitivePatterns = allPatterns.map((pattern) => new RegExp(pattern, 'i'));
  }

  /**
   * Sanitize a payload for logging
   */
  sanitize(payload: unknown): SanitizationResult {
    const startTime = performance.now();
    let redactedFields = 0;
    const originalSize = this.estimateSize(payload);

    const sanitized = this.sanitizeValue(payload, 0, new Set(), (field) => {
      redactedFields++;
      return field;
    });

    const sanitizedSize = this.estimateSize(sanitized);
    const sanitizationTimeMs = Math.round(performance.now() - startTime);

    return {
      sanitized,
      metrics: {
        sanitizationTimeMs,
        redactedFields,
        originalSize,
        sanitizedSize,
      },
    };
  }

  /**
   * Sanitize a value recursively
   */
  private sanitizeValue(
    value: unknown,
    depth: number,
    visited: Set<object>,
    onRedact: (fieldName: string) => void
  ): unknown {
    // Prevent infinite recursion
    if (depth > this.options.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value !== 'object') {
      if (typeof value === 'string') {
        return this.truncateString(value);
      }
      return value;
    }

    // Handle circular references
    if (visited.has(value as object)) {
      return '[CIRCULAR_REFERENCE]';
    }
    visited.add(value as object);

    try {
      // Handle special object types
      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof File) {
        onRedact('File');
        return this.options.includeFileMetadata
          ? {
              '[FILE_METADATA]': {
                name: value.name,
                size: value.size,
                type: value.type,
                lastModified: value.lastModified,
              },
            }
          : '[FILE_REDACTED]';
      }

      if (value instanceof FormData) {
        onRedact('FormData');
        return this.sanitizeFormData(value, depth, visited, onRedact);
      }

      if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
        onRedact('BinaryData');
        return this.options.includeFileMetadata
          ? {
              '[BINARY_METADATA]': {
                type: value.constructor.name,
                size: value.byteLength || (value as Uint8Array).length,
              },
            }
          : '[BINARY_REDACTED]';
      }

      // Handle arrays
      if (Array.isArray(value)) {
        return value.map((item, index) =>
          this.sanitizeValue(item, depth + 1, visited, (field) => onRedact(`[${index}].${field}`))
        );
      }

      // Handle plain objects
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (this.isSensitiveField(key)) {
          onRedact(key);
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = this.sanitizeValue(val, depth + 1, visited, (field) =>
            onRedact(`${key}.${field}`)
          );
        }
      }

      return sanitizedObj;
    } finally {
      visited.delete(value as object);
    }
  }

  /**
   * Sanitize FormData for logging
   */
  private sanitizeFormData(
    formData: FormData,
    depth: number,
    visited: Set<object>,
    onRedact: (fieldName: string) => void
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
      if (this.isSensitiveField(key)) {
        onRedact(key);
        sanitized[key] = '[REDACTED]';
      } else if (value instanceof File) {
        sanitized[key] = this.sanitizeValue(value, depth + 1, visited, onRedact);
      } else {
        sanitized[key] = this.truncateString(String(value));
      }
    }

    return {
      '[FORM_DATA]': sanitized,
    };
  }

  /**
   * Check if a field name matches sensitive patterns
   */
  private isSensitiveField(fieldName: string): boolean {
    return this.sensitivePatterns.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Check if an object contains only sensitive fields
   */
  private isObjectAllSensitive(obj: Record<string, unknown>): boolean {
    const keys = Object.keys(obj);
    return keys.length > 0 && keys.every((key) => this.isSensitiveField(key));
  }

  /**
   * Truncate string if it exceeds max length
   */
  private truncateString(str: string): string {
    if (str.length <= this.options.maxStringLength) {
      return str;
    }

    return `${str.substring(0, this.options.maxStringLength)}... [truncated, total length: ${str.length}]`;
  }

  /**
   * Estimate the size of a value for metrics
   */
  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      // Fallback for non-serializable values
      return String(value).length;
    }
  }
}

/**
 * Default sanitizer instance
 */
export const defaultSanitizer = new PayloadSanitizer();

/**
 * Convenience function for quick sanitization
 */
export function sanitizePayload(
  payload: unknown,
  options?: SanitizationOptions
): SanitizationResult {
  if (options) {
    const sanitizer = new PayloadSanitizer(options);
    return sanitizer.sanitize(payload);
  }
  return defaultSanitizer.sanitize(payload);
}

/**
 * Sanitize payload and return only the sanitized data (no metrics)
 */
export function sanitizePayloadQuick(payload: unknown, options?: SanitizationOptions): unknown {
  return sanitizePayload(payload, options).sanitized;
}

/**
 * Create operation-specific sanitizer with custom rules
 */
export function createOperationSanitizer(
  operationType: string,
  customRules: string[] = []
): PayloadSanitizer {
  const operationSpecificRules: Record<string, string[]> = {
    expense: ['merchant_name', 'description', 'notes'],
    receipt: ['filename', 'file_path'],
    user: ['email', 'phone', 'address', 'name'],
    payment: ['amount', 'currency', 'payment_method'],
  };

  const rules = [...customRules, ...(operationSpecificRules[operationType] || [])];

  return new PayloadSanitizer({
    customSensitiveFields: rules,
  });
}
