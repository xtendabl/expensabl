/**
 * Error codes for template-related errors
 */
export enum TEMPLATE_ERROR_CODES {
  // General errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_DATA = 'INVALID_DATA',

  // Template errors
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_LIMIT_EXCEEDED = 'TEMPLATE_LIMIT_EXCEEDED',
  INVALID_NAME = 'INVALID_NAME',

  // Scheduling errors
  SCHEDULING_ERROR = 'SCHEDULING_ERROR',
  INVALID_SCHEDULE = 'INVALID_SCHEDULE',

  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Migration errors
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  INVALID_SCHEMA = 'INVALID_SCHEMA',
}

/**
 * Custom error class for template-related errors
 */
export class TemplateError extends Error {
  constructor(
    public code: TEMPLATE_ERROR_CODES,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TemplateError';

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TemplateError);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
