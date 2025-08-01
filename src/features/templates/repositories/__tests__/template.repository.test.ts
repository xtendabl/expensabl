/**
 * Tests for TemplateRepository
 */

import { MemoryStorageProvider } from '../../../../shared/services/storage/providers/memory-storage';
import { StorageManager } from '../../../../shared/services/storage/transaction/manager';
import { ReadCache } from '../../../../shared/services/storage/transaction/cache';
import { TemplateRepository } from '../template.repository';
import { ExpenseTemplate } from '../../types';
import { TEMPLATE_CONSTANTS } from '../../constants/template.constants';

describe('TemplateRepository', () => {
  let storage: MemoryStorageProvider;
  let transactionManager: StorageManager;
  let cache: ReadCache;
  let repository: TemplateRepository;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    transactionManager = new StorageManager(storage);
    cache = new ReadCache();
    repository = new TemplateRepository(storage, transactionManager, cache);
  });

  describe('create', () => {
    it('should create a template and update metadata index', async () => {
      const template: ExpenseTemplate = {
        id: 'template_123',
        name: 'Test Template',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
        expenseData: {
          merchant: { name: 'Test Merchant' },
          merchantAmount: 100,
          merchantCurrency: 'USD',
        },
        scheduling: null,
        executionHistory: [],
        metadata: {
          createdFrom: 'manual',
          tags: ['test'],
          favorite: false,
          useCount: 0,
          scheduledUseCount: 0,
        },
      };

      await repository.create(template);

      // Verify template was stored
      const stored = await storage.get(`template.${template.id}`);
      expect(stored).toEqual(template);

      // Verify metadata index was updated
      const metadataIndex = await storage.get(TEMPLATE_CONSTANTS.STORAGE_KEYS.METADATA_INDEX_KEY);
      expect(metadataIndex).toHaveProperty(template.id);
      expect((metadataIndex as any)[template.id]).toMatchObject({
        id: template.id,
        name: template.name,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        hasScheduling: false,
        tags: ['test'],
        favorite: false,
        useCount: 0,
      });

      // Verify history was initialized
      const history = await storage.get(`template.history.${template.id}`);
      expect(history).toEqual([]);
    });
  });

  describe('get', () => {
    it('should retrieve a template by ID', async () => {
      const template: ExpenseTemplate = createMockTemplate('template_123');
      await storage.set({ [`template.${template.id}`]: template });

      const retrieved = await repository.get(template.id);
      expect(retrieved).toEqual(template);
    });

    it('should return null for non-existent template', async () => {
      const retrieved = await repository.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should cache retrieved templates', async () => {
      const template = createMockTemplate('template_123');
      await storage.set({ [`template.${template.id}`]: template });

      // First call - should hit storage
      const retrieved1 = await repository.get(template.id);
      expect(retrieved1).toEqual(template);

      // Clear storage to ensure cache is used
      await storage.remove([`template.${template.id}`]);

      // Second call - should hit cache
      const retrieved2 = await repository.get(template.id);
      expect(retrieved2).toEqual(template);
    });
  });

  describe('update', () => {
    it('should update a template and metadata index', async () => {
      const template = createMockTemplate('template_123');
      await repository.create(template);

      // Add small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updates = {
        name: 'Updated Template',
        metadata: { ...template.metadata, favorite: true },
      };

      const updated = await repository.update(template.id, updates);

      expect(updated.name).toBe('Updated Template');
      expect(updated.metadata.favorite).toBe(true);
      expect(updated.updatedAt).toBeGreaterThan(template.updatedAt);

      // Verify metadata index was updated
      const metadataIndex = await storage.get(TEMPLATE_CONSTANTS.STORAGE_KEYS.METADATA_INDEX_KEY);
      expect((metadataIndex as any)[template.id].name).toBe('Updated Template');
      expect((metadataIndex as any)[template.id].favorite).toBe(true);
    });

    it('should throw error when updating non-existent template', async () => {
      await expect(repository.update('non-existent', { name: 'New Name' })).rejects.toThrow(
        'Template non-existent not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete template and all related data', async () => {
      const template = createMockTemplate('template_123');
      await repository.create(template);

      // Add some execution history
      await storage.set({
        [`template.history.${template.id}`]: [
          { id: 'exec_1', executedAt: Date.now(), status: 'success' },
        ],
      });

      await repository.delete(template.id);

      // Verify template was deleted
      const retrieved = await storage.get(`template.${template.id}`);
      expect(retrieved).toBeNull();

      // Verify history was deleted
      const history = await storage.get(`template.history.${template.id}`);
      expect(history).toBeNull();

      // Verify metadata index was updated
      const metadataIndex = await storage.get(TEMPLATE_CONSTANTS.STORAGE_KEYS.METADATA_INDEX_KEY);
      expect(metadataIndex).not.toHaveProperty(template.id);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test templates
      const templates = [
        createMockTemplate('template_1', {
          name: 'Alpha',
          createdAt: 1000,
          metadata: {
            createdFrom: 'manual',
            tags: ['test'],
            favorite: true,
            useCount: 0,
            scheduledUseCount: 0,
          },
        }),
        createMockTemplate('template_2', {
          name: 'Beta',
          createdAt: 2000,
          metadata: {
            createdFrom: 'manual',
            tags: ['test'],
            favorite: false,
            useCount: 0,
            scheduledUseCount: 0,
          },
        }),
        createMockTemplate('template_3', {
          name: 'Gamma',
          createdAt: 3000,
          metadata: {
            createdFrom: 'manual',
            tags: ['test'],
            favorite: true,
            useCount: 0,
            scheduledUseCount: 0,
          },
        }),
      ];

      for (const template of templates) {
        await repository.create(template);
      }
    });

    it('should list templates with pagination', async () => {
      const result = await repository.list({ page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it('should sort templates', async () => {
      const result = await repository.list({ sortBy: 'name', sortOrder: 'asc' });

      expect(result.items[0].name).toBe('Alpha');
      expect(result.items[1].name).toBe('Beta');
      expect(result.items[2].name).toBe('Gamma');
    });

    it('should filter templates', async () => {
      const result = await repository.list({ filter: { favorite: true } });

      expect(result.items).toHaveLength(2);
      expect(result.items.every((t) => t.metadata.favorite)).toBe(true);
    });

    it('should support metadata-only listing', async () => {
      const result = await repository.list({ includeData: false });

      expect(result.items).toHaveLength(3);
      // Items should be metadata only, not full templates
      expect(result.items[0]).not.toHaveProperty('expenseData');
      expect(result.items[0]).toHaveProperty('name');
      expect(result.items[0]).toHaveProperty('createdAt');
    });
  });

  describe('scheduling operations', () => {
    it('should update scheduling and add to queue', async () => {
      const template = createMockTemplate('template_123');
      await repository.create(template);

      const scheduling = {
        enabled: true,
        paused: false,
        interval: 'daily' as const,
        executionTime: { hour: 9, minute: 0 },
        intervalConfig: {},
        nextExecution: Date.now() + 86400000, // Tomorrow
      };

      await repository.updateScheduling(template.id, scheduling);

      // Verify template was updated
      const updated = await repository.get(template.id);
      expect(updated?.scheduling).toEqual(scheduling);

      // Verify queue was updated
      const queue = await storage.get(TEMPLATE_CONSTANTS.STORAGE_KEYS.QUEUE_KEY);
      expect(queue).toHaveLength(1);
      expect((queue as any)[0]).toMatchObject({
        templateId: template.id,
        scheduledFor: scheduling.nextExecution,
        status: 'pending',
        attempts: 0,
      });
    });

    it('should remove from queue when scheduling is disabled', async () => {
      const template = createMockTemplate('template_123', {
        scheduling: {
          enabled: true,
          paused: false,
          interval: 'daily',
          executionTime: { hour: 9, minute: 0 },
          intervalConfig: {},
          nextExecution: Date.now() + 86400000,
        },
      });
      await repository.create(template);

      // Add to queue
      await storage.set({
        [TEMPLATE_CONSTANTS.STORAGE_KEYS.QUEUE_KEY]: [
          {
            templateId: template.id,
            scheduledFor: Date.now() + 86400000,
            status: 'pending',
            attempts: 0,
          },
        ],
      });

      // Disable scheduling
      await repository.updateScheduling(template.id, null);

      // Verify queue was updated
      const queue = await storage.get(TEMPLATE_CONSTANTS.STORAGE_KEYS.QUEUE_KEY);
      expect(queue).toHaveLength(0);
    });
  });
});

// Helper function to create mock templates
function createMockTemplate(id: string, overrides: Partial<ExpenseTemplate> = {}): ExpenseTemplate {
  return {
    id,
    name: 'Test Template',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
    expenseData: {
      merchant: { name: 'Test Merchant' },
      merchantAmount: 100,
      merchantCurrency: 'USD',
    },
    scheduling: null,
    executionHistory: [],
    metadata: {
      createdFrom: 'manual',
      tags: ['test'],
      favorite: false,
      useCount: 0,
      scheduledUseCount: 0,
    },
    ...overrides,
  };
}
