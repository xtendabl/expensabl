/**
 * Template model types
 */

import { ExpenseCreatePayload } from '../../expenses/types';

/**
 * Core template model
 */
export interface ExpenseTemplate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: string;
  expenseData: Partial<ExpenseCreatePayload>;
  scheduling: TemplateScheduling | null;
  executionHistory: TemplateExecution[];
  metadata: TemplateMetadata;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  sourceExpenseId?: string;
  createdFrom: 'manual' | 'expense';
  tags: string[];
  favorite: boolean;
  useCount: number;
  scheduledUseCount: number;
  lastUsed?: number;
}

/**
 * Lightweight template metadata for indexing
 */
export interface TemplateMetadataIndex {
  [templateId: string]: {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    hasScheduling: boolean;
    nextExecution?: number;
    lastUsed?: number;
    useCount: number;
    tags: string[];
    favorite: boolean;
  };
}

/**
 * Template scheduling configuration
 */
export interface TemplateScheduling {
  enabled: boolean;
  paused: boolean;
  interval: 'daily' | 'weekly' | 'monthly' | 'custom';
  executionTime: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
  intervalConfig: {
    daysOfWeek?: string[]; // For weekly: ['monday', 'tuesday']
    dayOfMonth?: number | 'last'; // For monthly: 1-31 or 'last'
    customIntervalMs?: number; // For custom: milliseconds
  };
  startDate?: number; // When to start scheduling
  endDate?: number; // When to stop (optional)
  nextExecution?: number; // Calculated next run time
}

/**
 * Template execution record
 */
export interface TemplateExecution {
  id: string;
  executedAt: number;
  status: 'success' | 'failed' | 'partial';
  expenseId?: string; // ID of created expense
  error?: string; // Error message if failed
  metadata?: Record<string, unknown>; // Additional execution data
}

/**
 * Request to create a template
 */
export interface CreateTemplateRequest {
  name: string;
  expenseData: Partial<ExpenseCreatePayload>;
  sourceExpenseId?: string;
  createdFrom?: 'manual' | 'expense';
  tags?: string[];
}

/**
 * Request to update a template
 */
export interface UpdateTemplateRequest {
  name?: string;
  expenseData?: Partial<ExpenseCreatePayload>;
  tags?: string[];
  favorite?: boolean;
  metadata?: Partial<TemplateMetadata>;
  scheduling?: TemplateScheduling | null;
  executionHistory?: TemplateExecution[];
}

/**
 * List options for template queries
 */
export interface ListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastUsed' | 'useCount';
  sortOrder?: 'asc' | 'desc';
  includeData?: boolean;
  filter?: {
    hasScheduling?: boolean;
    favorite?: boolean;
    tags?: string[];
    search?: string;
  };
}

/**
 * Paginated list result
 */
export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Template preferences
 */
export interface TemplatePreferences {
  defaultSchedulingTime: {
    hour: number;
    minute: number;
  };
  notificationsEnabled: boolean;
  autoCleanupEnabled: boolean;
  retentionDays: number;
  timezone: string;
}

/**
 * Scheduled execution queue item
 */
export interface ScheduledExecution {
  templateId: string;
  scheduledFor: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

/**
 * Validation result
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  data?: T;
}

/**
 * Storage quota information
 */
export interface QuotaInfo {
  used: number;
  total: number;
  percentage: number;
}

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0';
