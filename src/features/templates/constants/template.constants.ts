/**
 * Constants for template feature
 */
export const TEMPLATE_CONSTANTS = {
  // Business constraints
  LIMITS: {
    MAX_TEMPLATES: 100,
    MAX_TEMPLATE_NAME_LENGTH: 100,
    MIN_TEMPLATE_NAME_LENGTH: 1,
    MAX_EXECUTION_HISTORY: 50,
    MAX_SYNC_INDEX_SIZE: 10,
    MAX_TAGS_PER_TEMPLATE: 10,
    MAX_TAG_LENGTH: 50,
  },

  // Time intervals (with clear units)
  INTERVALS: {
    MIN_CUSTOM_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    MIN_CUSTOM_INTERVAL_MINUTES: 5, // For display
    MAX_CUSTOM_INTERVAL_MS: 365 * 24 * 60 * 60 * 1000, // 1 year
    DEFAULT_RETENTION_DAYS: 90,
    EXECUTION_TIMEOUT_MS: 30 * 1000, // 30 seconds
  },

  // ID generation
  ID_CONFIG: {
    TEMPLATE_PREFIX: 'template_',
    EXECUTION_PREFIX: 'execution_',
    MIGRATION_PREFIX: 'migration_',
    RANDOM_ID_LENGTH: 9,
    EXECUTION_ID_LENGTH: 6,
  },

  // Storage keys
  STORAGE_KEYS: {
    // Template data keys
    TEMPLATE_PREFIX: 'template.',
    METADATA_INDEX_KEY: 'template.metadata.index',
    QUEUE_KEY: 'template.scheduling.queue',
    PREFERENCES_KEY: 'template.preferences',

    // History keys
    HISTORY_PREFIX: 'template.history.',

    // Migration state
    MIGRATION_STATE_KEY: 'template.migration.state',
  },

  // Default values
  DEFAULTS: {
    TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
    NOTIFICATION_ENABLED: true,
    AUTO_CLEANUP_ENABLED: true,
    EXECUTION_HISTORY_SIZE: 50,
  },

  // Cache settings
  CACHE: {
    METADATA_TTL_MS: 5 * 60 * 1000, // 5 minutes
    TEMPLATE_TTL_MS: 2 * 60 * 1000, // 2 minutes
    INDEX_TTL_MS: 10 * 60 * 1000, // 10 minutes
  },
} as const;

// Type exports for type safety
export type TemplateLimits = typeof TEMPLATE_CONSTANTS.LIMITS;
export type TemplateIntervals = typeof TEMPLATE_CONSTANTS.INTERVALS;
export type StorageKeys = typeof TEMPLATE_CONSTANTS.STORAGE_KEYS;
export type CacheSettings = typeof TEMPLATE_CONSTANTS.CACHE;
