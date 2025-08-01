import { TEMPLATE_CONSTANTS } from './constants/template.constants';
import {
  CreateTemplateRequest,
  CURRENT_SCHEMA_VERSION,
  ExpenseTemplate,
  ListOptions,
  ListResult,
  QuotaInfo,
  TemplateExecution,
  TemplatePreferences,
  TemplateScheduling,
  UpdateTemplateRequest,
} from './types';
import { TemplateRepository } from './repositories/template.repository';
import { TemplateError, TEMPLATE_ERROR_CODES } from './errors';
import { ScheduleCalculator } from './scheduler';
import { TemplateValidator, ValidatedTemplateData } from './validator';
import { chromeLogger as logger } from '../../shared/services/logger/chrome-logger-setup';

/**
 * Main template manager that provides high-level API for template operations
 * Implements singleton pattern for consistent access across the extension
 */
export class TemplateManager {
  private repository: TemplateRepository;
  private validator: TemplateValidator;
  private scheduler: ScheduleCalculator;
  private static instance: TemplateManager;

  constructor(
    repository: TemplateRepository,
    validator: TemplateValidator,
    scheduler: ScheduleCalculator
  ) {
    this.repository = repository;
    this.validator = validator;
    this.scheduler = scheduler;
  }

  /**
   * Get singleton instance of TemplateManager
   * @deprecated Use TemplateServiceFactory.create() instead
   */
  static getInstance(): TemplateManager {
    throw new Error(
      'TemplateManager.getInstance() is deprecated. Use TemplateServiceFactory.create() instead.'
    );
  }

  // ==================== CRUD Operations ====================

  /**
   * Create a new expense template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<ExpenseTemplate> {
    const operationStart = performance.now();
    const operationId = 'create-template';
    const stepTimings: Record<string, number> = {};

    try {
      // Step 1: Validate (fail fast)
      const validationStart = performance.now();
      const validationResult = this.validator.validateCreateRequest(request);
      if (!validationResult.isValid) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.INVALID_DATA,
          validationResult.errors.join(', ')
        );
      }
      stepTimings.validation = Math.round(performance.now() - validationStart);

      // Step 2: Check business rules
      const businessRulesStart = performance.now();
      await this.checkCanCreateTemplate();
      stepTimings.business_rules = Math.round(performance.now() - businessRulesStart);

      // Step 3: Build template (pure function)
      const buildStart = performance.now();
      const template = this.buildTemplate(validationResult.data!);
      stepTimings.template_building = Math.round(performance.now() - buildStart);

      // Step 4: Persist (single operation)
      const persistStart = performance.now();
      await this.repository.create(template);
      stepTimings.persistence = Math.round(performance.now() - persistStart);

      const totalTime = Math.round(performance.now() - operationStart);

      logger.info(`Created template: ${template.id}`, {
        operationId,
        templateId: template.id,
        timing: {
          total: totalTime,
          steps: stepTimings,
          breakdown: {
            validation_pct: Math.round((stepTimings.validation / totalTime) * 100),
            business_rules_pct: Math.round((stepTimings.business_rules / totalTime) * 100),
            template_building_pct: Math.round((stepTimings.template_building / totalTime) * 100),
            persistence_pct: Math.round((stepTimings.persistence / totalTime) * 100),
          },
        },
        performance: {
          is_slow: totalTime > 5000,
          is_very_slow: totalTime > 10000,
        },
      });

      return template;
    } catch (error) {
      const errorTime = Math.round(performance.now() - operationStart);

      logger.error(`Failed to create template`, {
        operationId,
        error,
        timing: {
          total: errorTime,
          completed_steps: stepTimings,
        },
        performance_issue: 'operation_failed',
      });

      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: UpdateTemplateRequest
  ): Promise<ExpenseTemplate> {
    // Validate updates
    if (updates.name !== undefined) {
      const nameValidation = this.validator.validateTemplateName(updates.name);
      if (!nameValidation.isValid) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.INVALID_NAME,
          nameValidation.errors.join(', ')
        );
      }
    }

    if (updates.tags !== undefined) {
      const tagsValidation = this.validator.validateCreateRequest({
        name: 'temp',
        expenseData: {},
        tags: updates.tags,
      });
      if (tagsValidation.errors.some((e) => e.includes('tag'))) {
        throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_DATA, 'Invalid tags provided');
      }
    }

    // Convert UpdateTemplateRequest to Partial<ExpenseTemplate>
    const templateUpdates: Partial<ExpenseTemplate> = {
      ...updates,
      metadata: updates.metadata
        ? ({ ...updates.metadata } as ExpenseTemplate['metadata'])
        : undefined,
      updatedAt: Date.now(),
    };

    // Delegate to repository (transaction handled there)
    const updated = await this.repository.update(templateId, templateUpdates);

    logger.info(`Updated template: ${templateId}`);
    return updated;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!templateId) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_REQUEST, 'Template ID is required');
    }

    await this.repository.delete(templateId);
    logger.info(`Deleted template: ${templateId}`);
  }

  // ==================== Read Operations ====================

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<ExpenseTemplate | null> {
    if (!templateId) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_REQUEST, 'Template ID is required');
    }

    return this.repository.get(templateId);
  }

  /**
   * List templates with pagination and filtering
   */
  async listTemplates(options?: ListOptions): Promise<ListResult<ExpenseTemplate>> {
    return this.repository.list(options);
  }

  /**
   * Get template count
   */
  async getTemplateCount(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Check if a template exists
   */
  async templateExists(templateId: string): Promise<boolean> {
    return this.repository.exists(templateId);
  }

  // ==================== Scheduling Operations ====================

  /**
   * Set or update template scheduling
   */
  async setTemplateScheduling(templateId: string, scheduling: TemplateScheduling): Promise<void> {
    logger.info('setTemplateScheduling: Starting', { templateId, scheduling });

    // Verify template exists
    const exists = await this.templateExists(templateId);
    if (!exists) {
      logger.error('setTemplateScheduling: Template not found', { templateId });
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Template ${templateId} not found`
      );
    }

    logger.info('setTemplateScheduling: Template exists, validating scheduling');

    // Validate scheduling config
    const validationResult = this.validator.validateScheduling(scheduling);
    if (!validationResult.isValid) {
      logger.error('setTemplateScheduling: Validation failed', {
        templateId,
        errors: validationResult.errors,
        scheduling,
      });
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        validationResult.errors.join(', ')
      );
    }

    logger.info('setTemplateScheduling: Validation passed, calculating next execution');

    // Calculate next execution
    const nextExecution = this.scheduler.calculateNext(scheduling);
    const updatedScheduling = { ...scheduling, nextExecution: nextExecution || undefined };

    logger.info('setTemplateScheduling: Updating repository', {
      templateId,
      nextExecution,
      updatedScheduling,
    });

    // Update template and queue atomically
    await this.repository.updateScheduling(templateId, updatedScheduling);

    logger.info(`Updated scheduling for template: ${templateId}`);
  }

  /**
   * Remove scheduling from a template
   */
  async removeTemplateScheduling(templateId: string): Promise<void> {
    await this.repository.updateScheduling(templateId, null);
    logger.info(`Removed scheduling for template: ${templateId}`);
  }

  /**
   * Pause scheduling for a template
   * This sets the paused flag without removing the scheduling configuration
   */
  async pauseTemplateScheduling(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Template ${templateId} not found`
      );
    }

    if (!template.scheduling) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        `Template ${templateId} has no scheduling configuration`
      );
    }

    const updatedScheduling = { ...template.scheduling, paused: true };
    await this.repository.updateScheduling(templateId, updatedScheduling);
    logger.info(`Paused scheduling for template: ${templateId}`);
  }

  /**
   * Resume scheduling for a template
   * This clears the paused flag and recalculates the next execution time
   */
  async resumeTemplateScheduling(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Template ${templateId} not found`
      );
    }

    if (!template.scheduling) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        `Template ${templateId} has no scheduling configuration`
      );
    }

    const updatedScheduling = { ...template.scheduling, paused: false };

    // Recalculate next execution time
    const nextExecution = this.scheduler.calculateNext(updatedScheduling);
    updatedScheduling.nextExecution = nextExecution || undefined;

    await this.repository.updateScheduling(templateId, updatedScheduling);
    logger.info(`Resumed scheduling for template: ${templateId}`);
  }

  // ==================== Usage Tracking ====================

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Template ${templateId} not found`
      );
    }

    await this.repository.update(templateId, {
      metadata: {
        ...template.metadata,
        useCount: template.metadata.useCount + 1,
        lastUsed: Date.now(),
      },
    });
  }

  /**
   * Add execution record to template history
   */
  async addExecutionRecord(templateId: string, execution: TemplateExecution): Promise<void> {
    await this.repository.addExecutionRecord(templateId, execution);
    logger.info(`Added execution record for template: ${templateId}`);
  }

  // ==================== Preferences ====================

  /**
   * Get template preferences
   */
  async getTemplatePreferences(): Promise<TemplatePreferences> {
    return this.repository.getPreferences();
  }

  /**
   * Update template preferences
   */
  async updateTemplatePreferences(
    preferences: Partial<TemplatePreferences>
  ): Promise<TemplatePreferences> {
    const updated = await this.repository.updatePreferences(preferences);
    logger.info('Updated template preferences');
    return updated;
  }

  // ==================== Maintenance ====================

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<{ sync: QuotaInfo; local: QuotaInfo }> {
    const [localUsage, syncUsage] = await Promise.all([
      chrome.storage.local.getBytesInUse(),
      chrome.storage.sync.getBytesInUse(),
    ]);

    return {
      local: {
        used: localUsage,
        total: chrome.storage.local.QUOTA_BYTES || 10485760, // 10MB
        percentage: (localUsage / (chrome.storage.local.QUOTA_BYTES || 10485760)) * 100,
      },
      sync: {
        used: syncUsage,
        total: chrome.storage.sync.QUOTA_BYTES || 102400, // 100KB
        percentage: (syncUsage / (chrome.storage.sync.QUOTA_BYTES || 102400)) * 100,
      },
    };
  }

  /**
   * Clean up old execution history
   */
  async cleanupOldData(retentionDays?: number): Promise<number> {
    const days = retentionDays || TEMPLATE_CONSTANTS.INTERVALS.DEFAULT_RETENTION_DAYS;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    const templates = await this.listTemplates({ includeData: true, limit: 1000 });

    for (const template of templates.items) {
      const oldHistory = template.executionHistory.filter((e) => e.executedAt < cutoffTime);

      if (oldHistory.length > 0) {
        const newHistory = template.executionHistory.filter((e) => e.executedAt >= cutoffTime);
        await this.repository.update(template.id, {
          executionHistory: newHistory,
        });
        cleanedCount += oldHistory.length;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} old execution records`);
    return cleanedCount;
  }

  // ==================== Helper Methods ====================

  /**
   * Check if a new template can be created
   */
  private async checkCanCreateTemplate(): Promise<void> {
    const count = await this.repository.count();
    const limit = TEMPLATE_CONSTANTS.LIMITS.MAX_TEMPLATES;

    if (count >= limit) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_LIMIT_EXCEEDED,
        `Maximum ${limit} templates allowed. Delete an existing template first.`
      );
    }
  }

  /**
   * Build a new template from validated data
   */
  private buildTemplate(data: ValidatedTemplateData): ExpenseTemplate {
    const now = Date.now();

    return {
      id: this.generateTemplateId(),
      name: data.name,
      createdAt: now,
      updatedAt: now,
      version: CURRENT_SCHEMA_VERSION,
      expenseData: data.expenseData,
      scheduling: null,
      executionHistory: [],
      metadata: {
        sourceExpenseId: data.sourceExpenseId,
        createdFrom: data.createdFrom,
        tags: data.tags,
        favorite: false,
        useCount: 0,
        scheduledUseCount: 0,
      },
    };
  }

  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): string {
    const { TEMPLATE_PREFIX, RANDOM_ID_LENGTH } = TEMPLATE_CONSTANTS.ID_CONFIG;
    const timestamp = Date.now();
    const random = Math.random()
      .toString(36)
      .substring(2, 2 + RANDOM_ID_LENGTH);
    return `${TEMPLATE_PREFIX}${timestamp}_${random}`;
  }
}
