import { ScheduleCalculator } from '../scheduler';
import { TemplateScheduling, ValidationResult } from '../types';
import { TemplateError, TEMPLATE_ERROR_CODES } from '../errors';
import { TEMPLATE_CONSTANTS } from '../constants/template.constants';

describe('ScheduleCalculator', () => {
  let calculator: ScheduleCalculator;

  beforeEach(() => {
    calculator = new ScheduleCalculator();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Daily Scheduling', () => {
    const createDailySchedule = (
      hour: number,
      minute: number,
      enabled = true,
      paused = false,
      endDate?: number
    ): TemplateScheduling => ({
      enabled,
      paused,
      interval: 'daily',
      executionTime: { hour, minute },
      intervalConfig: {},
      endDate,
    });

    describe('calculateNext', () => {
      it('should schedule for today if time has not passed', () => {
        const now = new Date('2025-08-01T10:00:00');
        jest.setSystemTime(now);

        const schedule = createDailySchedule(14, 30);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-01T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should schedule for tomorrow if time has passed today', () => {
        const now = new Date('2025-08-01T16:00:00');
        jest.setSystemTime(now);

        const schedule = createDailySchedule(14, 30);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-02T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should return null for disabled schedule', () => {
        const schedule = createDailySchedule(14, 30, false);
        const next = calculator.calculateNext(schedule);

        expect(next).toBeNull();
      });

      it('should return null for paused schedule', () => {
        const schedule = createDailySchedule(14, 30, true, true);
        const next = calculator.calculateNext(schedule);

        expect(next).toBeNull();
      });

      it('should throw error if next execution would be after end date', () => {
        const now = new Date('2025-08-01T16:00:00');
        jest.setSystemTime(now);

        const endDate = new Date('2025-08-01T18:00:00').getTime();
        const schedule = createDailySchedule(14, 30, true, false, endDate);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Next execution would be after end date'
        );
      });

      it('should handle edge cases at midnight', () => {
        const now = new Date('2025-08-01T23:59:59');
        jest.setSystemTime(now);

        const schedule = createDailySchedule(0, 0);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-02T00:00:00');
        expect(next).toBe(expected.getTime());
      });
    });

    describe('validate', () => {
      it('should validate valid daily schedule', () => {
        const schedule = createDailySchedule(14, 30);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid hour', () => {
        const schedule = createDailySchedule(24, 30);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Hour must be between 0 and 23');
      });

      it('should reject negative hour', () => {
        const schedule = createDailySchedule(-1, 30);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Hour must be between 0 and 23');
      });

      it('should reject invalid minute', () => {
        const schedule = createDailySchedule(14, 60);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Minute must be between 0 and 59');
      });

      it('should reject negative minute', () => {
        const schedule = createDailySchedule(14, -1);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Minute must be between 0 and 59');
      });
    });
  });

  describe('Weekly Scheduling', () => {
    const createWeeklySchedule = (
      hour: number,
      minute: number,
      daysOfWeek: string[],
      enabled = true,
      paused = false,
      endDate?: number
    ): TemplateScheduling => ({
      enabled,
      paused,
      interval: 'weekly',
      executionTime: { hour, minute },
      intervalConfig: { daysOfWeek },
      endDate,
    });

    describe('calculateNext', () => {
      it('should schedule for next occurrence of specified day', () => {
        // Thursday
        const now = new Date('2025-01-02T10:00:00'); // Jan 2, 2025 is a Thursday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['friday']);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-03T14:30:00'); // Next day (Friday)
        expect(next).toBe(expected.getTime());
      });

      it('should schedule for same day if time has not passed', () => {
        // Friday
        const now = new Date('2025-01-03T10:00:00'); // Jan 3, 2025 is a Friday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['friday']);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-03T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should schedule for next week if time has passed on target day', () => {
        // Friday
        const now = new Date('2025-01-03T16:00:00'); // Jan 3, 2025 is a Friday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['friday']);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-10T14:30:00'); // Next Friday
        expect(next).toBe(expected.getTime());
      });

      it('should handle multiple days of week', () => {
        // Thursday
        const now = new Date('2025-01-02T10:00:00'); // Jan 2, 2025 is a Thursday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['monday', 'wednesday', 'friday']);
        const next = calculator.calculateNext(schedule);

        // Next occurrence is Friday
        const expected = new Date('2025-01-03T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle case-insensitive day names', () => {
        const now = new Date('2025-01-02T10:00:00'); // Thursday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['FRIDAY', 'Monday']);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-03T14:30:00'); // Friday
        expect(next).toBe(expected.getTime());
      });

      it('should throw error if no days specified', () => {
        const schedule = createWeeklySchedule(14, 30, []);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow('No days of week specified');
      });

      it('should throw error if next execution would be after end date', () => {
        const now = new Date('2025-01-02T10:00:00'); // Thursday
        jest.setSystemTime(now);

        const endDate = new Date('2025-01-02T18:00:00').getTime(); // Same day evening
        const schedule = createWeeklySchedule(14, 30, ['friday'], true, false, endDate);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Next execution would be after end date'
        );
      });

      it('should handle Sunday correctly', () => {
        // Saturday
        const now = new Date('2025-01-04T10:00:00'); // Jan 4, 2025 is a Saturday
        jest.setSystemTime(now);

        const schedule = createWeeklySchedule(14, 30, ['sunday']);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-05T14:30:00'); // Next day Sunday
        expect(next).toBe(expected.getTime());
      });
    });

    describe('validate', () => {
      it('should validate valid weekly schedule', () => {
        const schedule = createWeeklySchedule(14, 30, ['monday', 'wednesday']);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty days array', () => {
        const schedule = createWeeklySchedule(14, 30, []);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one day of week must be selected');
      });

      it('should reject invalid day names', () => {
        const schedule = createWeeklySchedule(14, 30, ['monday', 'funday']);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid days: funday');
      });

      it('should reject multiple invalid day names', () => {
        const schedule = createWeeklySchedule(14, 30, ['monday', 'funday', 'workday']);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid days: funday, workday');
      });
    });
  });

  describe('Monthly Scheduling', () => {
    const createMonthlySchedule = (
      hour: number,
      minute: number,
      dayOfMonth: number | 'last',
      enabled = true,
      paused = false,
      endDate?: number
    ): TemplateScheduling => ({
      enabled,
      paused,
      interval: 'monthly',
      executionTime: { hour, minute },
      intervalConfig: { dayOfMonth },
      endDate,
    });

    describe('calculateNext', () => {
      it('should schedule for current month if day has not passed', () => {
        const now = new Date('2025-08-05T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 15);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-15T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should schedule for next month if day has passed', () => {
        const now = new Date('2025-08-20T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 15);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-09-15T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle same day but time has passed', () => {
        const now = new Date('2025-08-15T16:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 15);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-09-15T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle "last" day of month', () => {
        const now = new Date('2025-08-15T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 'last');
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-31T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle "last" day when already on last day after time', () => {
        const now = new Date('2025-08-31T16:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 'last');
        const next = calculator.calculateNext(schedule);

        // September has 30 days
        const expected = new Date('2025-09-30T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle months with different day counts (February)', () => {
        // Start from January 31st after the scheduled time
        const now = new Date(2025, 0, 31, 16, 0, 0); // Jan 31, 2025, 4:00 PM
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 31);
        const next = calculator.calculateNext(schedule);

        // February doesn't have 31 days, should skip to March
        const expected = new Date(2025, 2, 31, 14, 30, 0); // March 31, 2025, 2:30 PM
        expect(next).toBe(expected.getTime());
      });

      it('should handle day 30 in February', () => {
        const now = new Date('2025-01-15T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 30);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-01-30T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle leap year February 29th', () => {
        const now = new Date('2024-02-01T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 29);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2024-02-29T14:30:00');
        expect(next).toBe(expected.getTime());
      });

      it('should skip non-leap year February 29th', () => {
        // January 29th, after the scheduled time
        const now = new Date(2025, 0, 29, 16, 0, 0); // Jan 29, 2025, 4:00 PM
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 29);
        const next = calculator.calculateNext(schedule);

        // 2025 is not a leap year, February has 28 days, so skip to March
        const expected = new Date(2025, 2, 29, 14, 30, 0); // March 29, 2025, 2:30 PM
        expect(next).toBe(expected.getTime());
      });

      it('should throw error for invalid day of month', () => {
        const schedule = createMonthlySchedule(14, 30, 32);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Day of month must be between 1 and 31'
        );
      });

      it('should throw error if next execution would be after end date', () => {
        const now = new Date('2025-08-20T10:00:00');
        jest.setSystemTime(now);

        const endDate = new Date('2025-08-25T18:00:00').getTime();
        const schedule = createMonthlySchedule(14, 30, 15, true, false, endDate);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Next execution would be after end date'
        );
      });

      it('should handle first day of month', () => {
        const now = new Date('2025-08-15T10:00:00');
        jest.setSystemTime(now);

        const schedule = createMonthlySchedule(14, 30, 1);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-09-01T14:30:00');
        expect(next).toBe(expected.getTime());
      });
    });

    describe('validate', () => {
      it('should validate valid monthly schedule', () => {
        const schedule = createMonthlySchedule(14, 30, 15);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate "last" day', () => {
        const schedule = createMonthlySchedule(14, 30, 'last');
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing day of month', () => {
        const schedule: TemplateScheduling = {
          enabled: true,
          paused: false,
          interval: 'monthly',
          executionTime: { hour: 14, minute: 30 },
          intervalConfig: {},
        };

        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Day of month is required');
      });

      it('should reject invalid day of month', () => {
        const schedule = createMonthlySchedule(14, 30, 0);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toMatch(/day of month/i);
      });

      it('should reject day greater than 31', () => {
        const schedule = createMonthlySchedule(14, 30, 32);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Day of month must be between 1 and 31 or "last"');
      });
    });
  });

  describe('Custom Interval Scheduling', () => {
    const createCustomSchedule = (
      customIntervalMs: number,
      startDate?: Date,
      endDate?: Date,
      enabled = true,
      paused = false
    ): TemplateScheduling => ({
      enabled,
      paused,
      interval: 'custom',
      executionTime: { hour: 0, minute: 0 }, // Not used for custom
      intervalConfig: {
        customIntervalMs,
      },
      startDate: startDate?.getTime(),
      endDate: endDate?.getTime(),
    });

    describe('calculateNext', () => {
      it('should calculate next execution based on interval', () => {
        const startDate = new Date('2025-08-01T10:00:00');
        const now = new Date('2025-08-01T10:30:00');
        jest.setSystemTime(now);

        const intervalMs = 60 * 60 * 1000; // 1 hour
        const schedule = createCustomSchedule(intervalMs, startDate);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-01T11:00:00');
        expect(next).toBe(expected.getTime());
      });

      it('should return start date if not reached yet', () => {
        const startDate = new Date('2025-08-01T14:00:00');
        const now = new Date('2025-08-01T10:00:00');
        jest.setSystemTime(now);

        const intervalMs = 60 * 60 * 1000; // 1 hour
        const schedule = createCustomSchedule(intervalMs, startDate);
        const next = calculator.calculateNext(schedule);

        expect(next).toBe(startDate.getTime());
      });

      it('should use grid-aligned calculation to prevent drift', () => {
        const startDate = new Date('2025-08-01T10:00:00');
        const now = new Date('2025-08-01T12:35:00'); // 2.58 intervals have passed
        jest.setSystemTime(now);

        const intervalMs = 60 * 60 * 1000; // 1 hour
        const schedule = createCustomSchedule(intervalMs, startDate);
        const next = calculator.calculateNext(schedule);

        // Should align to next grid point, not just add interval to current time
        const expected = new Date('2025-08-01T13:00:00');
        expect(next).toBe(expected.getTime());
      });

      it('should handle very long intervals', () => {
        const startDate = new Date('2025-08-01T10:00:00');
        const now = new Date('2025-08-01T11:00:00');
        jest.setSystemTime(now);

        const intervalMs = 7 * 24 * 60 * 60 * 1000; // 1 week
        const schedule = createCustomSchedule(intervalMs, startDate);
        const next = calculator.calculateNext(schedule);

        const expected = new Date('2025-08-08T10:00:00');
        expect(next).toBe(expected.getTime());
      });

      it('should throw error if no interval specified', () => {
        const schedule: TemplateScheduling = {
          enabled: true,
          paused: false,
          interval: 'custom',
          executionTime: { hour: 0, minute: 0 },
          intervalConfig: {},
        };

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Custom interval duration not specified'
        );
      });

      it('should throw error if start date is after end date', () => {
        const startDate = new Date('2025-08-10T10:00:00');
        const endDate = new Date('2025-08-01T10:00:00');
        const now = new Date('2025-08-01T09:00:00');
        jest.setSystemTime(now);

        const intervalMs = 60 * 60 * 1000;
        const schedule = createCustomSchedule(intervalMs, startDate, endDate);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow('Start date is after end date');
      });

      it('should throw error if next execution would be after end date', () => {
        const startDate = new Date('2025-08-01T10:00:00');
        const endDate = new Date('2025-08-01T11:30:00');
        const now = new Date('2025-08-01T11:00:00');
        jest.setSystemTime(now);

        const intervalMs = 60 * 60 * 1000; // 1 hour
        const schedule = createCustomSchedule(intervalMs, startDate, endDate);

        expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
        expect(() => calculator.calculateNext(schedule)).toThrow(
          'Next execution would be after end date'
        );
      });

      it('should handle minimum interval', () => {
        const startDate = new Date(2025, 0, 1, 10, 0, 0); // Jan 1, 2025, 10:00 AM
        const now = new Date(2025, 0, 1, 10, 5, 0); // 5 minutes later
        jest.setSystemTime(now);

        const intervalMs = TEMPLATE_CONSTANTS.INTERVALS.MIN_CUSTOM_INTERVAL_MS; // 5 minutes
        const schedule = createCustomSchedule(intervalMs, startDate);
        const next = calculator.calculateNext(schedule);

        // Grid-aligned: 1 interval has passed, next is at 10:10
        const expected = new Date(2025, 0, 1, 10, 10, 0);
        expect(next).toBe(expected.getTime());
      });
    });

    describe('validate', () => {
      it('should validate valid custom schedule', () => {
        const intervalMs = 60 * 60 * 1000; // 1 hour
        const schedule = createCustomSchedule(intervalMs);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing interval', () => {
        const schedule: TemplateScheduling = {
          enabled: true,
          paused: false,
          interval: 'custom',
          executionTime: { hour: 0, minute: 0 },
          intervalConfig: {},
        };

        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Custom interval duration is required');
      });

      it('should reject interval below minimum', () => {
        const intervalMs = 1000; // 1 second
        const schedule = createCustomSchedule(intervalMs);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Interval must be at least ${TEMPLATE_CONSTANTS.INTERVALS.MIN_CUSTOM_INTERVAL_MS / 60000} minutes`
        );
      });

      it('should reject interval above maximum', () => {
        const intervalMs = 400 * 24 * 60 * 60 * 1000; // 400 days
        const schedule = createCustomSchedule(intervalMs);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Interval cannot exceed ${TEMPLATE_CONSTANTS.INTERVALS.MAX_CUSTOM_INTERVAL_MS / (24 * 60 * 60000)} days`
        );
      });

      it('should accept minimum interval', () => {
        const intervalMs = TEMPLATE_CONSTANTS.INTERVALS.MIN_CUSTOM_INTERVAL_MS;
        const schedule = createCustomSchedule(intervalMs);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept maximum interval', () => {
        const intervalMs = TEMPLATE_CONSTANTS.INTERVALS.MAX_CUSTOM_INTERVAL_MS;
        const schedule = createCustomSchedule(intervalMs);
        const result = calculator.validate(schedule);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Timezone Handling', () => {
    it('should use provided timezone', () => {
      const now = new Date('2025-08-01T10:00:00');
      jest.setSystemTime(now);

      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'daily',
        executionTime: { hour: 14, minute: 30 },
        intervalConfig: {},
      };

      // Test with different timezone
      const next = calculator.calculateNext(schedule, 'America/New_York');

      // Verify next execution is calculated (exact time depends on implementation)
      expect(next).toBeGreaterThan(now.getTime());
    });

    it('should use default timezone if not provided', () => {
      const now = new Date('2025-08-01T10:00:00');
      jest.setSystemTime(now);

      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'daily',
        executionTime: { hour: 14, minute: 30 },
        intervalConfig: {},
      };

      const next = calculator.calculateNext(schedule);

      expect(next).toBeGreaterThan(now.getTime());
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown interval type', () => {
      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'yearly' as any,
        executionTime: { hour: 14, minute: 30 },
        intervalConfig: {},
      };

      expect(() => calculator.calculateNext(schedule)).toThrow(TemplateError);
      expect(() => calculator.calculateNext(schedule)).toThrow(
        'Unknown scheduling interval: yearly'
      );
    });

    it('should return error for unknown interval in validation', () => {
      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'yearly' as any,
        executionTime: { hour: 14, minute: 30 },
        intervalConfig: {},
      };

      const result = calculator.validate(schedule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown scheduling interval: yearly');
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle date boundary correctly', () => {
      // Test scheduling at 23:59
      const now = new Date('2025-08-01T23:58:00');
      jest.setSystemTime(now);

      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'daily',
        executionTime: { hour: 23, minute: 59 },
        intervalConfig: {},
      };

      const next = calculator.calculateNext(schedule);
      const expected = new Date('2025-08-01T23:59:00');
      expect(next).toBe(expected.getTime());
    });

    it('should handle year boundary for monthly scheduling', () => {
      const now = new Date('2025-12-20T10:00:00');
      jest.setSystemTime(now);

      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'monthly',
        executionTime: { hour: 14, minute: 30 },
        intervalConfig: { dayOfMonth: 15 },
      };

      const next = calculator.calculateNext(schedule);
      const expected = new Date('2026-01-15T14:30:00');
      expect(next).toBe(expected.getTime());
    });

    it('should handle week boundary for weekly scheduling', () => {
      // Saturday
      const now = new Date('2025-01-04T16:00:00'); // Jan 4, 2025 is a Saturday
      jest.setSystemTime(now);

      const schedule: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: 'weekly',
        executionTime: { hour: 10, minute: 0 },
        intervalConfig: { daysOfWeek: ['monday'] },
      };

      const next = calculator.calculateNext(schedule);
      const expected = new Date('2025-01-06T10:00:00'); // Next Monday
      expect(next).toBe(expected.getTime());
    });
  });
});
