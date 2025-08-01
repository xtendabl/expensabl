import { TEMPLATE_CONSTANTS } from './constants/template.constants';
import { TemplateScheduling, ValidationResult } from './types';
import { TemplateError, TEMPLATE_ERROR_CODES } from './errors';

/**
 * Configuration for schedule calculation
 */
interface ScheduleConfig {
  hour: number;
  minute: number;
  timezone: string;
  daysOfWeek?: string[];
  dayOfMonth?: number | 'last';
  customIntervalMs?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Strategy interface for different scheduling intervals
 */
interface ScheduleStrategy {
  calculateNext(from: Date, config: ScheduleConfig): Date;
  validate(config: ScheduleConfig): ValidationResult;
}

/**
 * Type for scheduling intervals
 */
type ScheduleInterval = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Calculates next execution times for template scheduling
 * Uses strategy pattern to handle different interval types
 */
export class ScheduleCalculator {
  private strategies: Map<ScheduleInterval, ScheduleStrategy>;

  constructor() {
    this.strategies = new Map([
      ['daily', new DailyScheduleStrategy()],
      ['weekly', new WeeklyScheduleStrategy()],
      ['monthly', new MonthlyScheduleStrategy()],
      ['custom', new CustomIntervalStrategy()],
    ]);
  }

  /**
   * Calculate the next execution time for a schedule
   */
  calculateNext(scheduling: TemplateScheduling, timezone?: string): number | null {
    if (!scheduling.enabled || scheduling.paused) {
      return null;
    }

    const strategy = this.strategies.get(scheduling.interval);
    if (!strategy) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        `Unknown scheduling interval: ${scheduling.interval}`
      );
    }

    const config = this.buildConfig(scheduling, timezone);
    const from = new Date();

    const nextDate = strategy.calculateNext(from, config);
    return nextDate.getTime();
  }

  /**
   * Validate a scheduling configuration
   */
  validate(scheduling: TemplateScheduling): ValidationResult {
    const strategy = this.strategies.get(scheduling.interval);
    if (!strategy) {
      return {
        isValid: false,
        errors: [`Unknown scheduling interval: ${scheduling.interval}`],
      };
    }

    const config = this.buildConfig(scheduling);
    return strategy.validate(config);
  }

  /**
   * Build configuration object from scheduling data
   */
  private buildConfig(scheduling: TemplateScheduling, timezone?: string): ScheduleConfig {
    return {
      hour: scheduling.executionTime.hour,
      minute: scheduling.executionTime.minute,
      timezone: timezone || TEMPLATE_CONSTANTS.DEFAULTS.TIMEZONE,
      ...scheduling.intervalConfig,
      startDate: scheduling.startDate ? new Date(scheduling.startDate) : new Date(),
      endDate: scheduling.endDate ? new Date(scheduling.endDate) : undefined,
    };
  }
}

/**
 * Strategy for daily scheduling
 */
class DailyScheduleStrategy implements ScheduleStrategy {
  calculateNext(from: Date, config: ScheduleConfig): Date {
    const next = new Date(from);
    next.setHours(config.hour, config.minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }

    // Check end date
    if (config.endDate && next > config.endDate) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        'Next execution would be after end date'
      );
    }

    return next;
  }

  validate(config: ScheduleConfig): ValidationResult {
    const errors: string[] = [];

    if (config.hour < 0 || config.hour > 23) {
      errors.push('Hour must be between 0 and 23');
    }

    if (config.minute < 0 || config.minute > 59) {
      errors.push('Minute must be between 0 and 59');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Strategy for weekly scheduling
 */
class WeeklyScheduleStrategy implements ScheduleStrategy {
  private static readonly DAY_ORDER = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  calculateNext(from: Date, config: ScheduleConfig): Date {
    if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'No days of week specified');
    }

    const targetDays = new Set(
      config.daysOfWeek.map((d) => WeeklyScheduleStrategy.DAY_ORDER.indexOf(d.toLowerCase()))
    );

    const next = new Date(from);
    next.setHours(config.hour, config.minute, 0, 0);

    // Find next valid day
    for (let i = 0; i < 8; i++) {
      if (i > 0 || next > from) {
        if (targetDays.has(next.getDay())) {
          // Check end date
          if (config.endDate && next > config.endDate) {
            throw new TemplateError(
              TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
              'Next execution would be after end date'
            );
          }
          return next;
        }
      }
      next.setDate(next.getDate() + 1);
    }

    throw new TemplateError(
      TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
      'Could not calculate next weekly execution'
    );
  }

  validate(config: ScheduleConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
      errors.push('At least one day of week must be selected');
    } else {
      const invalidDays = config.daysOfWeek.filter(
        (day) => !WeeklyScheduleStrategy.DAY_ORDER.includes(day.toLowerCase())
      );

      if (invalidDays.length > 0) {
        errors.push(`Invalid days: ${invalidDays.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Strategy for monthly scheduling
 */
class MonthlyScheduleStrategy implements ScheduleStrategy {
  // Documenting due to complex month boundary handling logic
  /**
   * Calculates next monthly execution handling edge cases like month boundaries.
   * Supports both specific day-of-month and "last day" scheduling.
   *
   * @param from - Starting date to calculate from
   * @param config - Schedule configuration with day of month
   * @returns Next execution date
   * @throws {TemplateError} If day is invalid or next execution exceeds end date
   *
   * @remarks
   * Edge cases handled:
   * - **Day 31 in February**: Skips to next month with 31 days
   * - **"last" day**: Always uses actual last day (28/29/30/31)
   * - **Past time today**: Moves to same day next month
   * - **Invalid day**: Validates 1-31 range
   *
   * The algorithm sets date to 1st first to avoid JavaScript
   * date rollover (e.g., Jan 31 → Feb 31 → Mar 3).
   */
  calculateNext(from: Date, config: ScheduleConfig): Date {
    const next = new Date(from);
    next.setHours(config.hour, config.minute, 0, 0);

    if (config.dayOfMonth === 'last') {
      // Set to last day of current month
      next.setMonth(next.getMonth() + 1, 0);

      if (next <= from) {
        // Move to last day of next month
        next.setMonth(next.getMonth() + 2, 0);
      }
    } else {
      const day = config.dayOfMonth as number;

      // Validate day
      if (day < 1 || day > 31) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
          'Day of month must be between 1 and 31'
        );
      }

      // First, try current month
      next.setDate(1); // Set to first of month to avoid date rollover issues
      next.setDate(day);

      // If time has passed or day doesn't exist in current month, find next valid month
      if (next <= from || next.getDate() !== day) {
        // Find next month with this day
        let targetMonth = next.getMonth() + 1;
        while (true) {
          next.setMonth(targetMonth, day);
          if (next.getDate() === day) {
            break; // Found a month with this day
          }
          targetMonth++;
        }
      }
    }

    // Check end date
    if (config.endDate && next > config.endDate) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        'Next execution would be after end date'
      );
    }

    return next;
  }

  validate(config: ScheduleConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.dayOfMonth) {
      errors.push('Day of month is required');
    } else if (config.dayOfMonth !== 'last') {
      const day = config.dayOfMonth as number;
      if (day < 1 || day > 31) {
        errors.push('Day of month must be between 1 and 31 or "last"');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Strategy for custom interval scheduling
 */
class CustomIntervalStrategy implements ScheduleStrategy {
  calculateNext(from: Date, config: ScheduleConfig): Date {
    if (!config.customIntervalMs) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        'Custom interval duration not specified'
      );
    }

    const startDate = config.startDate || new Date();
    const intervalMs = config.customIntervalMs;

    // If we haven't reached the start time yet, the next execution is the start time
    if (from.getTime() < startDate.getTime()) {
      // Check end date
      if (config.endDate && startDate > config.endDate) {
        throw new TemplateError(
          TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
          'Start date is after end date'
        );
      }
      return startDate;
    }

    // Grid-aligned calculation to prevent drift
    const elapsedMs = from.getTime() - startDate.getTime();
    const intervalsPassed = Math.floor(elapsedMs / intervalMs);
    const nextInterval = intervalsPassed + 1;

    const next = new Date(startDate.getTime() + nextInterval * intervalMs);

    // Check end date
    if (config.endDate && next > config.endDate) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.SCHEDULING_ERROR,
        'Next execution would be after end date'
      );
    }

    return next;
  }

  validate(config: ScheduleConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.customIntervalMs) {
      errors.push('Custom interval duration is required');
    } else {
      const { MIN_CUSTOM_INTERVAL_MS, MAX_CUSTOM_INTERVAL_MS } = TEMPLATE_CONSTANTS.INTERVALS;

      if (config.customIntervalMs < MIN_CUSTOM_INTERVAL_MS) {
        errors.push(`Interval must be at least ${MIN_CUSTOM_INTERVAL_MS / 60000} minutes`);
      }

      if (config.customIntervalMs > MAX_CUSTOM_INTERVAL_MS) {
        errors.push(`Interval cannot exceed ${MAX_CUSTOM_INTERVAL_MS / (24 * 60 * 60000)} days`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
