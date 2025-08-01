import { TemplateManager } from './manager';
import { ScheduleCalculator } from './scheduler';
import { ExpenseTemplate, TemplateScheduling } from './types';
import { chromeLogger as logger } from '../../shared/services/logger/chrome-logger-setup';
import { authAwareExpenseManager as expenseManager } from '../expenses/manager-with-auth';
import { ExpenseCreatePayload } from '../expenses/types';

/**
 * Chrome alarms-based scheduling engine for automated template execution.
 * Ensures singleton alarm listener registration and prevents duplicate
 * executions through deduplication tracking.
 *
 * @class SchedulingEngine
 *
 * @remarks
 * Key features:
 * - Singleton pattern with class-level listener tracking
 * - Duplicate execution prevention within 30-second window
 * - Survives service worker restarts through Chrome alarms API
 * - Automatic cleanup on service worker termination
 *
 * @example
 * ```typescript
 * const engine = getSchedulingEngine(templateManager);
 * await engine.initialize();
 *
 * // Schedule a template for daily execution
 * await engine.scheduleTemplate({
 *   id: 'template-123',
 *   scheduling: {
 *     enabled: true,
 *     interval: 'daily',
 *     executionTime: { hour: 9, minute: 0 }
 *   }
 * });
 * ```
 */
export class SchedulingEngine {
  private static readonly ALARM_PREFIX = 'template_schedule_';
  private calculator: ScheduleCalculator;
  private isInitialized = false;
  private boundHandleAlarm: ((alarm: chrome.alarms.Alarm) => Promise<void>) | null = null;
  private static listenerRegistered = false; // Class-level tracking
  private static initializationLock = false; // Prevent concurrent initialization
  private executionTracker = new Map<string, number>(); // Track recent executions

  constructor(
    private templateManager: TemplateManager,
    private readonly loggerService = logger
  ) {
    this.calculator = new ScheduleCalculator();
  }

  // Documenting due to complex singleton initialization with duplicate prevention
  /**
   * Initializes the scheduling engine with singleton alarm listener registration.
   * Prevents duplicate listeners across service worker restarts.
   *
   * @returns Promise that resolves when initialization is complete
   *
   * @remarks
   * This method ensures only ONE alarm listener exists globally by:
   * 1. Checking instance-level initialization flag
   * 2. Using class-level lock to prevent concurrent initialization
   * 3. Removing any existing listener before adding new one
   * 4. Tracking listener registration at class level
   *
   * Critical for preventing duplicate expense creation when service
   * worker restarts multiple times.
   */
  async initialize(): Promise<void> {
    // Check if already initialized
    if (this.isInitialized) {
      this.loggerService.warn('SchedulingEngine: Already initialized, skipping');
      return;
    }

    // Prevent concurrent initialization
    if (SchedulingEngine.initializationLock) {
      this.loggerService.warn('SchedulingEngine: Initialization already in progress');
      return;
    }

    SchedulingEngine.initializationLock = true;

    try {
      this.loggerService.info('SchedulingEngine: Initializing', {
        listenerAlreadyRegistered: SchedulingEngine.listenerRegistered,
        timestamp: Date.now(),
      });

      // Check if alarms API is available
      if (!chrome.alarms) {
        this.loggerService.warn(
          'SchedulingEngine: chrome.alarms API not available. Ensure "alarms" permission is in manifest.json'
        );
        return;
      }

      // Create bound handler if not already created
      if (!this.boundHandleAlarm) {
        this.boundHandleAlarm = this.handleAlarm.bind(this);
      }

      // Remove any existing listener before adding (prevent duplicates)
      if (SchedulingEngine.listenerRegistered) {
        this.loggerService.info('SchedulingEngine: Removing existing alarm listener');
        chrome.alarms.onAlarm.removeListener(this.boundHandleAlarm);
        SchedulingEngine.listenerRegistered = false;
      }

      // Set up alarm listener
      chrome.alarms.onAlarm.addListener(this.boundHandleAlarm);
      SchedulingEngine.listenerRegistered = true;
      this.loggerService.info('SchedulingEngine: Alarm listener registered');

      // Schedule all enabled templates
      await this.scheduleAllTemplates();

      this.isInitialized = true;
      this.loggerService.info('SchedulingEngine: Initialized successfully');
    } finally {
      SchedulingEngine.initializationLock = false;
    }
  }

  /**
   * Schedule all enabled templates
   */
  async scheduleAllTemplates(): Promise<void> {
    try {
      const templates = await this.templateManager.listTemplates();
      const scheduledCount = await Promise.all(
        templates.items
          .filter((t) => t.scheduling?.enabled && !t.scheduling.paused)
          .map((t) => this.scheduleTemplate(t))
      ).then((results) => results.filter(Boolean).length);

      this.loggerService.info('SchedulingEngine: Scheduled templates', {
        total: templates.items.length,
        scheduled: scheduledCount,
      });
    } catch (error) {
      this.loggerService.error('SchedulingEngine: Failed to schedule templates', { error });
    }
  }

  /**
   * Schedule a single template
   */
  async scheduleTemplate(template: ExpenseTemplate): Promise<boolean> {
    if (!template.scheduling?.enabled || template.scheduling.paused) {
      // Remove any existing alarm
      await this.cancelTemplateAlarm(template.id);
      return false;
    }

    try {
      const nextExecution = this.calculator.calculateNext(template.scheduling);
      if (!nextExecution) {
        this.loggerService.warn('SchedulingEngine: Could not calculate next execution', {
          templateId: template.id,
        });
        return false;
      }

      // Create or update alarm
      const alarmName = this.getAlarmName(template.id);
      await chrome.alarms.create(alarmName, {
        when: nextExecution,
      });

      // Update template with next execution time
      await this.templateManager.updateTemplate(template.id, {
        ...template,
        scheduling: {
          ...template.scheduling,
          nextExecution,
        },
      });

      this.loggerService.info('SchedulingEngine: Scheduled template', {
        templateId: template.id,
        templateName: template.name,
        nextExecution: new Date(nextExecution).toISOString(),
      });

      return true;
    } catch (error) {
      this.loggerService.error('SchedulingEngine: Failed to schedule template', {
        templateId: template.id,
        error,
      });
      return false;
    }
  }

  /**
   * Cancel a template's alarm
   */
  async cancelTemplateAlarm(templateId: string): Promise<void> {
    const alarmName = this.getAlarmName(templateId);
    await chrome.alarms.clear(alarmName);

    this.loggerService.info('SchedulingEngine: Cancelled template alarm', { templateId });
  }

  // Documenting due to deduplication logic preventing duplicate executions
  /**
   * Handles Chrome alarm triggers with deduplication to prevent duplicate executions.
   * Tracks recent executions to handle multiple service worker instances.
   *
   * @param alarm - Chrome alarm that fired
   * @returns Promise that resolves when template execution completes
   *
   * @remarks
   * Deduplication is critical because:
   * - Multiple service workers may have registered listeners
   * - Chrome may fire alarms multiple times on wake
   * - Network delays can cause overlapping executions
   *
   * Uses 30-second window to detect duplicates and cleans up
   * tracking entries older than 5 minutes to prevent memory growth.
   */
  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (!alarm.name.startsWith(SchedulingEngine.ALARM_PREFIX)) {
      return; // Not our alarm
    }

    const templateId = alarm.name.substring(SchedulingEngine.ALARM_PREFIX.length);

    // Deduplication check - prevent duplicate executions within 30 seconds
    const lastExecution = this.executionTracker.get(templateId);
    const now = Date.now();
    if (lastExecution && now - lastExecution < 30000) {
      this.loggerService.warn('SchedulingEngine: Skipping duplicate execution', {
        templateId,
        timeSinceLastExecution: now - lastExecution,
        scheduledTime: alarm.scheduledTime,
      });
      return;
    }

    // Track this execution
    this.executionTracker.set(templateId, now);

    // Clean up old entries (older than 5 minutes)
    for (const [id, time] of this.executionTracker.entries()) {
      if (now - time > 300000) {
        this.executionTracker.delete(id);
      }
    }

    this.loggerService.info('SchedulingEngine: Alarm triggered', {
      templateId,
      scheduledTime: alarm.scheduledTime,
      instanceId: Math.random().toString(36).substr(2, 9), // For debugging multiple instances
    });

    try {
      // Execute the template
      await this.executeTemplate(templateId);

      // Schedule next execution
      const template = await this.templateManager.getTemplate(templateId);
      if (template && template.scheduling?.enabled && !template.scheduling.paused) {
        await this.scheduleTemplate(template);
      }
    } catch (error) {
      this.loggerService.error('SchedulingEngine: Failed to handle alarm', {
        templateId,
        error,
      });
    }
  }

  // Documenting due to complex template to expense transformation with policy handling
  /**
   * Executes a template by creating an expense with proper data transformation.
   * Handles multiple policy field formats for backward compatibility.
   *
   * @param templateId - ID of the template to execute
   * @throws {Error} If template not found or missing required data
   *
   * @remarks
   * Transforms template data to expense payload:
   * - Adds today's date to the expense
   * - Handles policy field migration (object → string)
   * - Updates execution history with success/failure
   * - Shows user notification with result
   *
   * Policy field handling supports three formats:
   * 1. Old: `{ id: string }` object
   * 2. New: `policyType` string field
   * 3. Fallback: `policy` as string
   */
  private async executeTemplate(templateId: string): Promise<void> {
    const template = await this.templateManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.loggerService.info('SchedulingEngine: Executing template', {
      templateId,
      templateName: template.name,
    });

    try {
      // Create expense from template - ensure all required fields
      if (
        !template.expenseData.merchantAmount ||
        !template.expenseData.merchantCurrency ||
        !template.expenseData.merchant
      ) {
        throw new Error('Template missing required expense data');
      }

      // Create expense data with today's date
      const templateData: any = template.expenseData;
      const expenseData: any = {
        merchantAmount: templateData.merchantAmount,
        merchantCurrency: templateData.merchantCurrency,
        date: new Date().toISOString().split('T')[0], // Today's date
        merchant: templateData.merchant,
      };

      // Handle policy field - convert from old format if needed
      if (
        templateData.policy &&
        typeof templateData.policy === 'object' &&
        'id' in templateData.policy
      ) {
        // Old format: { id: string }
        expenseData.policyType = templateData.policy.id;
      } else if (templateData.policyType) {
        // New format: string
        expenseData.policyType = templateData.policyType;
      } else if (templateData.policy && typeof templateData.policy === 'string') {
        // Fallback: policy as string
        expenseData.policyType = templateData.policy;
      }

      // Add optional fields if they exist
      if (templateData.details) {
        expenseData.details = templateData.details;
      }
      if (templateData.reportingData) {
        expenseData.reportingData = templateData.reportingData;
      }

      const expense = await expenseManager.createExpense(expenseData);

      // Extract expense ID - check both uuid and id fields like the manual flow does
      const expenseId = expense.uuid || expense.id || 'unknown';

      // Update template usage and execution history
      await this.templateManager.updateTemplate(templateId, {
        ...template,
        executionHistory: [
          ...template.executionHistory,
          {
            id: `exec_${Date.now()}`,
            executedAt: Date.now(),
            status: 'success',
            expenseId,
            metadata: { executionType: 'scheduled' },
          },
        ],
        metadata: {
          ...template.metadata,
          scheduledUseCount: (template.metadata.scheduledUseCount || 0) + 1,
          lastUsed: Date.now(),
        },
      });

      // Show notification
      await this.showNotification(template, expenseId === 'unknown' ? null : expenseId, true);

      this.loggerService.info('SchedulingEngine: Template executed successfully', {
        templateId,
        expenseId,
      });
    } catch (error) {
      // Update execution history with failure
      await this.templateManager.updateTemplate(templateId, {
        ...template,
        executionHistory: [
          ...template.executionHistory,
          {
            id: `exec_${Date.now()}`,
            executedAt: Date.now(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { executionType: 'scheduled' },
          },
        ],
      });

      // Show error notification
      await this.showNotification(template, null, false, error);

      throw error;
    }
  }

  /**
   * Show notification for template execution
   */
  private async showNotification(
    template: ExpenseTemplate,
    expenseId: string | null,
    success: boolean,
    error?: unknown
  ): Promise<void> {
    const notificationId = `template_${template.id}_${Date.now()}`;

    if (success && expenseId) {
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'expensabl-icon.png',
        title: 'Expense Created',
        message: `Template "${template.name}" executed successfully`,
        contextMessage: `Expense ID: ${expenseId}`,
        priority: 1,
      });
    } else {
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'expensabl-icon.png',
        title: 'Template Execution Failed',
        message: `Failed to execute template "${template.name}"`,
        contextMessage: error instanceof Error ? error.message : 'Unknown error',
        priority: 2,
      });
    }
  }

  /**
   * Cleanup method to properly dispose of resources
   */
  cleanup(): void {
    this.loggerService.info('SchedulingEngine: Cleaning up');

    if (this.boundHandleAlarm && SchedulingEngine.listenerRegistered) {
      chrome.alarms.onAlarm.removeListener(this.boundHandleAlarm);
      SchedulingEngine.listenerRegistered = false;
      this.loggerService.info('SchedulingEngine: Alarm listener removed');
    }

    this.isInitialized = false;
    this.executionTracker.clear();
  }

  /**
   * Get alarm name for a template
   */
  private getAlarmName(templateId: string): string {
    return `${SchedulingEngine.ALARM_PREFIX}${templateId}`;
  }

  /**
   * Get all scheduled template alarms
   */
  async getScheduledAlarms(): Promise<chrome.alarms.Alarm[]> {
    const allAlarms = await chrome.alarms.getAll();
    return allAlarms.filter((alarm) => alarm.name.startsWith(SchedulingEngine.ALARM_PREFIX));
  }

  /**
   * Clear all template alarms (useful for cleanup)
   */
  async clearAllAlarms(): Promise<void> {
    const alarms = await this.getScheduledAlarms();
    await Promise.all(alarms.map((alarm) => chrome.alarms.clear(alarm.name)));

    this.loggerService.info('SchedulingEngine: Cleared all alarms', {
      count: alarms.length,
    });
  }
}

// Create singleton instance with stronger enforcement
let engineInstance: SchedulingEngine | null = null;
let engineTemplateManager: TemplateManager | null = null;

export function getSchedulingEngine(templateManager: TemplateManager): SchedulingEngine {
  if (!engineInstance) {
    engineInstance = new SchedulingEngine(templateManager);
    engineTemplateManager = templateManager;
  } else if (engineTemplateManager !== templateManager) {
    // Warn if trying to create with different template manager
    logger.warn('SchedulingEngine: Attempted to create with different TemplateManager', {
      existingManager: engineTemplateManager,
      newManager: templateManager,
    });
  }
  return engineInstance;
}

// Export cleanup function for service worker
export function cleanupSchedulingEngine(): void {
  if (engineInstance) {
    engineInstance.cleanup();
    engineInstance = null;
    engineTemplateManager = null;
  }
}
