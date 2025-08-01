/**
 * Template repository for data access using shared storage infrastructure
 */

import { StorageProvider } from '../../../shared/services/storage/interfaces/storage-provider';
import { StorageManager } from '../../../shared/services/storage/transaction/manager';
import { ReadCache } from '../../../shared/services/storage/transaction/cache';
import { Transaction } from '../../../shared/services/storage/interfaces/transaction';
import { TEMPLATE_CONSTANTS } from '../constants/template.constants';
import {
  ExpenseTemplate,
  ListOptions,
  ListResult,
  TemplateMetadataIndex,
  ScheduledExecution,
  TemplateExecution,
  TemplatePreferences,
} from '../types';
import { TemplateError, TEMPLATE_ERROR_CODES } from '../errors';

/**
 * Repository for template data access operations
 */
export class TemplateRepository {
  private readonly TEMPLATE_PREFIX = TEMPLATE_CONSTANTS.STORAGE_KEYS.TEMPLATE_PREFIX;
  private readonly METADATA_INDEX_KEY = TEMPLATE_CONSTANTS.STORAGE_KEYS.METADATA_INDEX_KEY;
  private readonly QUEUE_KEY = TEMPLATE_CONSTANTS.STORAGE_KEYS.QUEUE_KEY;
  private readonly PREFERENCES_KEY = TEMPLATE_CONSTANTS.STORAGE_KEYS.PREFERENCES_KEY;
  private readonly HISTORY_PREFIX = TEMPLATE_CONSTANTS.STORAGE_KEYS.HISTORY_PREFIX;

  constructor(
    private storage: StorageProvider,
    private transactionManager: StorageManager,
    private cache: ReadCache
  ) {}

  /**
   * Create a new template
   */
  async create(template: ExpenseTemplate): Promise<void> {
    return this.transactionManager.execute(async (tx: Transaction) => {
      // Store template
      await tx.set(`${this.TEMPLATE_PREFIX}${template.id}`, template);

      // Update metadata index
      const metadata = (await tx.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
      metadata[template.id] = this.buildMetadataEntry(template);
      await tx.set(this.METADATA_INDEX_KEY, metadata);

      // Initialize empty history
      await tx.set(`${this.HISTORY_PREFIX}${template.id}`, []);

      // Clear cache
      this.cache.delete(this.METADATA_INDEX_KEY);
      this.cache.delete(`template.${template.id}`);
    });
  }

  /**
   * Get a template by ID
   */
  async get(id: string): Promise<ExpenseTemplate | null> {
    const cacheKey = `template.${id}`;
    const cached = this.cache.get<ExpenseTemplate>(cacheKey);
    if (cached) return cached;

    const template = await this.storage.get<ExpenseTemplate>(`${this.TEMPLATE_PREFIX}${id}`);
    if (template) {
      this.cache.set(cacheKey, template);
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(id: string, updates: Partial<ExpenseTemplate>): Promise<ExpenseTemplate> {
    return this.transactionManager.execute(async (tx: Transaction) => {
      const existing = await tx.get<ExpenseTemplate>(`${this.TEMPLATE_PREFIX}${id}`);
      if (!existing) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
          `Template ${id} not found`
        );
      }

      const updated = {
        ...existing,
        ...updates,
        id: existing.id, // Prevent ID changes
        createdAt: existing.createdAt, // Prevent creation date changes
        updatedAt: Date.now(),
        metadata: updates.metadata
          ? { ...existing.metadata, ...updates.metadata }
          : existing.metadata, // Preserve and merge metadata
      };

      // Update template
      await tx.set(`${this.TEMPLATE_PREFIX}${id}`, updated);

      // Update metadata index
      const metadata = (await tx.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
      metadata[id] = this.buildMetadataEntry(updated);
      await tx.set(this.METADATA_INDEX_KEY, metadata);

      // Clear cache
      this.cache.delete(this.METADATA_INDEX_KEY);
      this.cache.delete(`template.${id}`);
      this.cache.delete(`metadata.${id}`);

      return updated;
    });
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    return this.transactionManager.execute(async (tx: Transaction) => {
      // Remove template data
      await tx.remove(`${this.TEMPLATE_PREFIX}${id}`);

      // Remove history
      await tx.remove(`${this.HISTORY_PREFIX}${id}`);

      // Update metadata index
      const metadata = (await tx.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
      delete metadata[id];
      await tx.set(this.METADATA_INDEX_KEY, metadata);

      // Update scheduling queue
      const queue = (await tx.get<ScheduledExecution[]>(this.QUEUE_KEY)) || [];
      const newQueue = queue.filter((e) => e.templateId !== id);
      await tx.set(this.QUEUE_KEY, newQueue);

      // Clear cache
      this.cache.delete(this.METADATA_INDEX_KEY);
      this.cache.delete(`template.${id}`);
      this.cache.delete(`metadata.${id}`);
    });
  }

  /**
   * Get template metadata
   */
  async getMetadata(id: string): Promise<TemplateMetadataIndex[string] | null> {
    const cacheKey = `metadata.${id}`;
    const cached = this.cache.get<TemplateMetadataIndex[string]>(cacheKey);
    if (cached) return cached;

    const index = await this.getMetadataIndex();
    const metadata = index[id] || null;

    if (metadata) {
      this.cache.set(cacheKey, metadata);
    }

    return metadata;
  }

  /**
   * Check if a template exists
   */
  async exists(id: string): Promise<boolean> {
    const metadata = await this.getMetadata(id);
    return metadata !== null;
  }

  /**
   * Get template count
   */
  async count(): Promise<number> {
    const index = await this.getMetadataIndex();
    return Object.keys(index).length;
  }

  /**
   * List templates with pagination and filtering
   */
  async list(options: ListOptions = {}): Promise<ListResult<ExpenseTemplate>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      includeData = true,
      filter,
    } = options;

    const metadata = await this.getMetadataIndex();
    let entries = Object.entries(metadata);

    // Apply filters
    if (filter) {
      entries = entries.filter(([_, meta]) => {
        if (filter.hasScheduling !== undefined && meta.hasScheduling !== filter.hasScheduling) {
          return false;
        }
        if (filter.favorite !== undefined && meta.favorite !== filter.favorite) {
          return false;
        }
        if (filter.tags && filter.tags.length > 0) {
          const hasAnyTag = filter.tags.some((tag) => meta.tags.includes(tag));
          if (!hasAnyTag) return false;
        }
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          if (!meta.name.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        return true;
      });
    }

    // Sort
    entries.sort(([, a], [, b]) => {
      const aVal = a[sortBy as keyof typeof a];
      const bVal = b[sortBy as keyof typeof b];

      // Handle different types
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }

      // For non-numeric values, convert to string and compare
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
    });

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageEntries = entries.slice(start, end);

    if (!includeData) {
      // When includeData is false, we return metadata as a partial template
      return {
        items: pageEntries.map(([, meta]) => meta as unknown as ExpenseTemplate),
        total: entries.length,
        page,
        pageSize: limit,
        hasMore: end < entries.length,
      };
    }

    // Load full data
    const ids = pageEntries.map(([id]) => id);
    const templates = await this.getTemplatesByIds(ids);

    return {
      items: templates,
      total: entries.length,
      page,
      pageSize: limit,
      hasMore: end < entries.length,
    };
  }

  /**
   * Get templates by IDs
   */
  async getTemplatesByIds(ids: string[]): Promise<ExpenseTemplate[]> {
    const keys = ids.map((id) => `${this.TEMPLATE_PREFIX}${id}`);
    const results: Record<string, ExpenseTemplate | null> = {};
    for (const key of keys) {
      results[key] = await this.storage.get<ExpenseTemplate>(key);
    }

    return ids
      .map((id) => results[`${this.TEMPLATE_PREFIX}${id}`])
      .filter((template): template is ExpenseTemplate => template !== null);
  }

  /**
   * Update template scheduling
   */
  async updateScheduling(id: string, scheduling: ExpenseTemplate['scheduling']): Promise<void> {
    return this.transactionManager.execute(async (tx: Transaction) => {
      const template = await tx.get<ExpenseTemplate>(`${this.TEMPLATE_PREFIX}${id}`);
      if (!template) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
          `Template ${id} not found`
        );
      }

      // Update template
      template.scheduling = scheduling;
      template.updatedAt = Date.now();
      await tx.set(`${this.TEMPLATE_PREFIX}${id}`, template);

      // Update metadata index
      const metadata = (await tx.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
      metadata[id] = this.buildMetadataEntry(template);
      await tx.set(this.METADATA_INDEX_KEY, metadata);

      // Update scheduling queue
      const queue = (await tx.get<ScheduledExecution[]>(this.QUEUE_KEY)) || [];
      const queueWithoutTemplate = queue.filter((e) => e.templateId !== id);

      if (scheduling?.enabled && !scheduling.paused && scheduling.nextExecution) {
        queueWithoutTemplate.push({
          templateId: id,
          scheduledFor: scheduling.nextExecution,
          status: 'pending',
          attempts: 0,
        });
      }

      await tx.set(this.QUEUE_KEY, queueWithoutTemplate);

      // Clear cache
      this.cache.delete(`template.${id}`);
      this.cache.delete(`metadata.${id}`);
      this.cache.delete(this.METADATA_INDEX_KEY);
    });
  }

  /**
   * Add execution record
   */
  async addExecutionRecord(templateId: string, execution: TemplateExecution): Promise<void> {
    return this.transactionManager.execute(async (tx: Transaction) => {
      const historyKey = `${this.HISTORY_PREFIX}${templateId}`;
      const history = (await tx.get<TemplateExecution[]>(historyKey)) || [];

      // Add new execution
      history.unshift(execution);

      // Keep only recent history
      const maxHistory = TEMPLATE_CONSTANTS.LIMITS.MAX_EXECUTION_HISTORY;
      if (history.length > maxHistory) {
        history.splice(maxHistory);
      }

      await tx.set(historyKey, history);

      // Update template metadata if successful
      if (execution.status === 'success') {
        const template = await tx.get<ExpenseTemplate>(`${this.TEMPLATE_PREFIX}${templateId}`);
        if (template) {
          template.metadata.scheduledUseCount += 1;
          template.metadata.lastUsed = execution.executedAt;
          await tx.set(`${this.TEMPLATE_PREFIX}${templateId}`, template);

          // Update metadata index
          const metadata = (await tx.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
          metadata[templateId] = this.buildMetadataEntry(template);
          await tx.set(this.METADATA_INDEX_KEY, metadata);
        }
      }

      // Clear cache
      this.cache.delete(`template.${templateId}`);
      this.cache.delete(`metadata.${templateId}`);
    });
  }

  /**
   * Get template preferences
   */
  async getPreferences(): Promise<TemplatePreferences> {
    const prefs = await this.storage.get<TemplatePreferences>(this.PREFERENCES_KEY);
    return (
      prefs || {
        defaultSchedulingTime: { hour: 9, minute: 0 },
        notificationsEnabled: TEMPLATE_CONSTANTS.DEFAULTS.NOTIFICATION_ENABLED,
        autoCleanupEnabled: TEMPLATE_CONSTANTS.DEFAULTS.AUTO_CLEANUP_ENABLED,
        retentionDays: TEMPLATE_CONSTANTS.INTERVALS.DEFAULT_RETENTION_DAYS,
        timezone: TEMPLATE_CONSTANTS.DEFAULTS.TIMEZONE,
      }
    );
  }

  /**
   * Update template preferences
   */
  async updatePreferences(updates: Partial<TemplatePreferences>): Promise<TemplatePreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    await this.storage.set({ [this.PREFERENCES_KEY]: updated });
    return updated;
  }

  /**
   * Get metadata index
   */
  private async getMetadataIndex(): Promise<TemplateMetadataIndex> {
    const cacheKey = this.METADATA_INDEX_KEY;
    const cached = this.cache.get<TemplateMetadataIndex>(cacheKey);
    if (cached) return cached;

    const index = (await this.storage.get<TemplateMetadataIndex>(this.METADATA_INDEX_KEY)) || {};
    this.cache.set(cacheKey, index);

    return index;
  }

  /**
   * Build metadata entry from template
   */
  private buildMetadataEntry(template: ExpenseTemplate): TemplateMetadataIndex[string] {
    return {
      id: template.id,
      name: template.name,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      hasScheduling: !!template.scheduling?.enabled,
      nextExecution: template.scheduling?.nextExecution,
      lastUsed: template.metadata.lastUsed,
      useCount: template.metadata.useCount,
      tags: template.metadata.tags,
      favorite: template.metadata.favorite,
    };
  }
}
