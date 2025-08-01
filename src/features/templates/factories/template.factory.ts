/**
 * Factory for creating template services with proper dependency injection
 */

import { ChromeStorageProvider } from '../../../shared/services/storage/providers/chrome-storage';
import { MemoryStorageProvider } from '../../../shared/services/storage/providers/memory-storage';
import { StorageManager } from '../../../shared/services/storage/transaction/manager';
import { ReadCache } from '../../../shared/services/storage/transaction/cache';
import { StorageProvider } from '../../../shared/services/storage/interfaces/storage-provider';
import { TemplateRepository } from '../repositories/template.repository';
import { TemplateValidator } from '../validator';
import { ScheduleCalculator } from '../scheduler';
import { TemplateManager } from '../manager';

/**
 * Factory for creating template services
 */
export class TemplateServiceFactory {
  private static instance: TemplateManager;

  /**
   * Create template service with Chrome storage (production)
   */
  static create(): TemplateManager {
    if (!this.instance) {
      const storage = new ChromeStorageProvider();
      const transactionManager = new StorageManager(storage);
      const cache = new ReadCache();

      const repository = new TemplateRepository(storage, transactionManager, cache);
      const validator = new TemplateValidator();
      const scheduler = new ScheduleCalculator();

      this.instance = new TemplateManager(repository, validator, scheduler);
    }

    return this.instance;
  }

  /**
   * Create template service with custom dependencies (for testing)
   */
  static createWithDependencies(
    storage: StorageProvider,
    transactionManager?: StorageManager,
    cache?: ReadCache
  ): TemplateManager {
    const txManager = transactionManager || new StorageManager(storage);
    const storageCache = cache || new ReadCache();

    const repository = new TemplateRepository(storage, txManager, storageCache);
    const validator = new TemplateValidator();
    const scheduler = new ScheduleCalculator();

    return new TemplateManager(repository, validator, scheduler);
  }

  /**
   * Create template service with memory storage (for testing)
   */
  static createForTesting(): TemplateManager {
    const storage = new MemoryStorageProvider();
    return this.createWithDependencies(storage);
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null!;
  }
}
