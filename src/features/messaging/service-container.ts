import { tokenManager } from '../auth/manager';
import { authAwareExpenseManager } from '../expenses/manager-with-auth';
import { TemplateServiceFactory } from '../templates/factories/template.factory';
import { getSchedulingEngine, SchedulingEngine } from '../templates/scheduling-engine';
import { chromeLogger as logger } from '../../shared/services/logger/chrome-logger-setup';
import { HandlerDependencies } from './types';

/**
 * Interface for service container to ensure type safety
 */
export interface IServiceContainer extends HandlerDependencies {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  cleanup(): void;
  schedulingEngine: SchedulingEngine;
}

/**
 * Service container that provides a unified interface for all services.
 * Handles initialization and dependency management.
 */
export class ServiceContainer implements IServiceContainer {
  private initialized = false;

  // Services are exposed as readonly to prevent external modification
  readonly tokenManager = tokenManager;
  readonly expenseManager = authAwareExpenseManager;
  readonly templateManager = TemplateServiceFactory.create();
  readonly logger = logger;
  readonly schedulingEngine: SchedulingEngine;

  // Receipt service is now part of expense service, provide direct access
  get receiptService(): any {
    // Return the expense service which has receipt methods
    const expenseService = this.expenseManager.getExpenseService();
    return {
      uploadReceipt: expenseService.uploadReceipt.bind(expenseService),
      deleteReceipt: expenseService.deleteReceipt.bind(expenseService),
      getReceiptUrl: expenseService.getReceiptUrl.bind(expenseService),
    };
  }

  constructor() {
    // Initialize scheduling engine with the template manager
    this.schedulingEngine = getSchedulingEngine(this.templateManager);
  }

  /**
   * Initialize all services if needed.
   * Can be extended to handle async initialization in the future.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize the scheduling engine
      await this.schedulingEngine.initialize();

      this.logger.info('Service container initialized');
      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize service container', { error });
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup all services and resources
   */
  cleanup(): void {
    this.logger.info('Service container cleanup started');

    // Cleanup scheduling engine
    this.schedulingEngine.cleanup();

    this.initialized = false;
    this.logger.info('Service container cleanup completed');
  }
}

/**
 * Factory function to create and optionally initialize a service container
 */
export async function createServiceContainer(autoInitialize = true): Promise<IServiceContainer> {
  const container = new ServiceContainer();

  if (autoInitialize) {
    await container.initialize();
  }

  return container;
}

// Export a singleton instance for convenience
let defaultContainer: IServiceContainer | null = null;

export async function getDefaultServiceContainer(): Promise<IServiceContainer> {
  if (!defaultContainer) {
    defaultContainer = await createServiceContainer();
  }
  return defaultContainer;
}
