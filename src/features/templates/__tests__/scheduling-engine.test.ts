import { SchedulingEngine } from '../scheduling-engine';
import { TemplateManager } from '../manager';
import { ExpenseTemplate } from '../types';
import { expenseManager } from '../../expenses/manager';

// Mock dependencies
jest.mock('../../expenses/manager');
jest.mock('../scheduler', () => ({
  ScheduleCalculator: jest.fn().mockImplementation(() => ({
    calculateNext: jest.fn().mockReturnValue(Date.now() + 3600000),
  })),
}));
jest.mock('../../../shared/services/logger/chrome-logger-setup', () => ({
  chromeLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SchedulingEngine', () => {
  let engine: SchedulingEngine;
  let mockTemplateManager: jest.Mocked<TemplateManager>;
  let mockChrome: any;

  const mockTemplate: ExpenseTemplate = {
    id: 'template-123',
    name: 'Test Template',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0',
    expenseData: {
      merchantAmount: 100,
      merchantCurrency: 'USD',
      date: new Date().toISOString().split('T')[0],
      merchant: { name: 'Test Merchant' },
      details: {
        category: 'travel',
        description: 'Test expense',
      },
    },
    scheduling: {
      enabled: true,
      paused: false,
      interval: 'daily',
      executionTime: { hour: 9, minute: 0 },
      intervalConfig: {},
    },
    executionHistory: [],
    metadata: {
      createdFrom: 'manual',
      tags: [],
      favorite: false,
      useCount: 0,
      scheduledUseCount: 0,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock chrome.alarms API
    mockChrome = {
      alarms: {
        create: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
        getAll: jest.fn().mockResolvedValue([]),
        onAlarm: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
      },
      notifications: {
        create: jest.fn(),
      },
    };
    (global as any).chrome = mockChrome;

    // Mock template manager
    mockTemplateManager = {
      listTemplates: jest.fn().mockResolvedValue({ items: [] }),
      getTemplate: jest.fn().mockResolvedValue(mockTemplate),
      updateTemplate: jest.fn().mockResolvedValue(mockTemplate),
    } as any;

    // Mock expense manager
    (expenseManager.createExpense as jest.Mock).mockResolvedValue({
      id: 'expense-123',
      amount: 100,
    });

    engine = new SchedulingEngine(mockTemplateManager);
  });

  afterEach(() => {
    delete (global as any).chrome;
  });

  describe('initialize', () => {
    it('should set up alarm listener and schedule templates', async () => {
      mockTemplateManager.listTemplates.mockResolvedValue({
        items: [mockTemplate],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false,
      });

      await engine.initialize();

      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTemplateManager.listTemplates).toHaveBeenCalled();
      expect(mockChrome.alarms.create).toHaveBeenCalled();
    });
  });

  describe('scheduleTemplate', () => {
    it('should create alarm for enabled template', async () => {
      const result = await engine.scheduleTemplate(mockTemplate);

      expect(result).toBe(true);
      expect(mockChrome.alarms.create).toHaveBeenCalledWith('template_schedule_template-123', {
        when: expect.any(Number),
      });
      expect(mockTemplateManager.updateTemplate).toHaveBeenCalled();
    });

    it('should cancel alarm for disabled template', async () => {
      const disabledTemplate: ExpenseTemplate = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: false,
        },
      };

      const result = await engine.scheduleTemplate(disabledTemplate);

      expect(result).toBe(false);
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('template_schedule_template-123');
      expect(mockChrome.alarms.create).not.toHaveBeenCalled();
    });

    it('should cancel alarm for paused template', async () => {
      const pausedTemplate: ExpenseTemplate = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          paused: true,
        },
      };

      const result = await engine.scheduleTemplate(pausedTemplate);

      expect(result).toBe(false);
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('template_schedule_template-123');
    });
  });

  describe('alarm handling', () => {
    let alarmHandler: Function;

    beforeEach(async () => {
      await engine.initialize();
      alarmHandler = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
    });

    it('should execute template when alarm triggers', async () => {
      const alarm = {
        name: 'template_schedule_template-123',
        scheduledTime: Date.now(),
      };

      await alarmHandler(alarm);

      expect(mockTemplateManager.getTemplate).toHaveBeenCalledWith('template-123');
      expect(expenseManager.createExpense).toHaveBeenCalledWith(mockTemplate.expenseData);
      expect(mockTemplateManager.updateTemplate).toHaveBeenCalled();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Expense Created',
          message: expect.stringContaining('Test Template'),
        })
      );
    });

    it('should handle execution failure', async () => {
      const error = new Error('Expense creation failed');
      (expenseManager.createExpense as jest.Mock).mockRejectedValue(error);

      const alarm = {
        name: 'template_schedule_template-123',
        scheduledTime: Date.now(),
      };

      await alarmHandler(alarm);

      expect(mockTemplateManager.updateTemplate).toHaveBeenCalledWith(
        'template-123',
        expect.objectContaining({
          executionHistory: expect.arrayContaining([
            expect.objectContaining({
              status: 'failed',
              error: 'Expense creation failed',
            }),
          ]),
        })
      );
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Template Execution Failed',
        })
      );
    });

    it('should ignore non-template alarms', async () => {
      const alarm = {
        name: 'other_alarm',
        scheduledTime: Date.now(),
      };

      await alarmHandler(alarm);

      expect(mockTemplateManager.getTemplate).not.toHaveBeenCalled();
      expect(expenseManager.createExpense).not.toHaveBeenCalled();
    });
  });

  describe('getScheduledAlarms', () => {
    it('should return only template alarms', async () => {
      mockChrome.alarms.getAll.mockResolvedValue([
        { name: 'template_schedule_123', scheduledTime: Date.now() },
        { name: 'template_schedule_456', scheduledTime: Date.now() },
        { name: 'other_alarm', scheduledTime: Date.now() },
      ]);

      const alarms = await engine.getScheduledAlarms();

      expect(alarms).toHaveLength(2);
      expect(alarms.every((a) => a.name.startsWith('template_schedule_'))).toBe(true);
    });
  });

  describe('clearAllAlarms', () => {
    it('should clear all template alarms', async () => {
      mockChrome.alarms.getAll.mockResolvedValue([
        { name: 'template_schedule_123', scheduledTime: Date.now() },
        { name: 'template_schedule_456', scheduledTime: Date.now() },
      ]);

      await engine.clearAllAlarms();

      expect(mockChrome.alarms.clear).toHaveBeenCalledTimes(2);
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('template_schedule_123');
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('template_schedule_456');
    });
  });
});
