import { TEMPLATE_CONSTANTS } from './constants/template.constants';
import { ExpenseCreatePayload } from '../expenses/types';
import { CreateTemplateRequest, TemplateScheduling, ValidationResult } from './types';
import { info } from '../../shared/services/logger/chrome-logger-setup';

/**
 * Interface for individual field validators
 */
interface Validator {
  validate(value: unknown): ValidationResult;
}

/**
 * Validated template data after normalization
 */
export interface ValidatedTemplateData {
  name: string;
  expenseData: Partial<ExpenseCreatePayload>;
  sourceExpenseId?: string;
  createdFrom: 'manual' | 'expense';
  tags: string[];
}

/**
 * Provides comprehensive validation for template operations
 */
export class TemplateValidator {
  private validators: Map<string, Validator>;

  constructor() {
    this.validators = new Map([
      ['name', new NameValidator()],
      ['expenseData', new ExpenseDataValidator()],
      ['scheduling', new SchedulingValidator()],
      ['tags', new TagsValidator()],
    ]);
  }

  /**
   * Validate a create template request
   */
  validateCreateRequest(request: CreateTemplateRequest): ValidationResult<ValidatedTemplateData> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate each field
    for (const [field, validator] of this.validators) {
      const value = request[field as keyof CreateTemplateRequest];
      if (value !== undefined) {
        const result = validator.validate(value);
        errors.push(...result.errors);
        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      }
    }

    // Check required fields
    if (!request.name) {
      errors.push('Template name is required');
    }

    if (!request.expenseData) {
      errors.push('Expense data is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? this.normalizeData(request) : undefined,
    };
  }

  /**
   * Validate a template name
   */
  validateTemplateName(name: string): ValidationResult {
    return this.validators.get('name')!.validate(name);
  }

  /**
   * Validate scheduling configuration
   */
  validateScheduling(scheduling: TemplateScheduling): ValidationResult {
    return this.validators.get('scheduling')!.validate(scheduling);
  }

  /**
   * Normalize and clean request data
   */
  private normalizeData(request: CreateTemplateRequest): ValidatedTemplateData {
    return {
      name: request.name.trim(),
      expenseData: request.expenseData,
      sourceExpenseId: request.sourceExpenseId,
      createdFrom: request.createdFrom || 'manual',
      tags: this.normalizeTags(request.tags || []),
    };
  }

  /**
   * Normalize tags array
   */
  private normalizeTags(tags: string[]): string[] {
    return tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
      .slice(0, TEMPLATE_CONSTANTS.LIMITS.MAX_TAGS_PER_TEMPLATE);
  }
}

/**
 * Validates template names
 */
class NameValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push('Template name must be a string');
      return { isValid: false, errors };
    }

    const name = value.trim();
    const { MIN_TEMPLATE_NAME_LENGTH, MAX_TEMPLATE_NAME_LENGTH } = TEMPLATE_CONSTANTS.LIMITS;

    if (name.length < MIN_TEMPLATE_NAME_LENGTH) {
      errors.push(`Template name must be at least ${MIN_TEMPLATE_NAME_LENGTH} character`);
    }

    if (name.length > MAX_TEMPLATE_NAME_LENGTH) {
      errors.push(`Template name must be ${MAX_TEMPLATE_NAME_LENGTH} characters or less`);
    }

    // Check for invalid characters
    if (!/^[\w\s\-\.]+$/.test(name)) {
      errors.push('Template name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Validates expense data
 */
class ExpenseDataValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!value || typeof value !== 'object') {
      errors.push('Expense data must be an object');
      return { isValid: false, errors };
    }

    const data = value as ExpenseCreatePayload;

    // Required fields
    if (!data.merchant || typeof data.merchant !== 'object') {
      errors.push('Merchant information is required');
    } else if (typeof data.merchant.name !== 'string' || !data.merchant.name) {
      errors.push('Merchant name is required');
    }

    if (!data.merchantAmount || typeof data.merchantAmount !== 'number') {
      errors.push('Merchant amount is required');
    } else if (data.merchantAmount <= 0) {
      errors.push('Merchant amount must be positive');
    } else if (data.merchantAmount > 999999) {
      warnings.push('Merchant amount seems unusually high');
    }

    if (!data.merchantCurrency || typeof data.merchantCurrency !== 'string') {
      errors.push('Merchant currency is required');
    } else if (!/^[A-Z]{3}$/.test(data.merchantCurrency)) {
      errors.push('Currency must be a 3-letter code (e.g., USD)');
    }

    // Optional fields validation
    if (data.policyType) {
      if (typeof data.policyType !== 'string') {
        errors.push('Policy type must be a string');
      }
    }

    if (data.details) {
      if (typeof data.details !== 'object') {
        errors.push('Details must be an object');
      } else {
        if (data.details.category && typeof data.details.category !== 'string') {
          errors.push('Details category must be a string');
        }
        if (data.details.description && typeof data.details.description !== 'string') {
          errors.push('Details description must be a string');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Validates scheduling configuration
 */
class SchedulingValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const errors: string[] = [];

    if (!value || typeof value !== 'object') {
      errors.push('Scheduling must be an object');
      return { isValid: false, errors };
    }

    const scheduling = value as TemplateScheduling;

    // Log the scheduling object for debugging
    info('[SchedulingValidator] Validating scheduling:', JSON.stringify(scheduling, null, 2));

    // Validate execution time
    if (!scheduling.executionTime) {
      errors.push('Execution time is required');
    } else {
      if (
        typeof scheduling.executionTime.hour !== 'number' ||
        scheduling.executionTime.hour < 0 ||
        scheduling.executionTime.hour > 23
      ) {
        errors.push('Hour must be between 0 and 23');
      }

      if (
        typeof scheduling.executionTime.minute !== 'number' ||
        scheduling.executionTime.minute < 0 ||
        scheduling.executionTime.minute > 59
      ) {
        errors.push('Minute must be between 0 and 59');
      }
    }

    // Validate interval-specific configuration
    switch (scheduling.interval) {
      case 'daily':
        // No additional config needed
        break;

      case 'weekly':
        if (!scheduling.intervalConfig) {
          errors.push('Interval configuration is required for weekly scheduling');
        } else if (
          !scheduling.intervalConfig.daysOfWeek ||
          scheduling.intervalConfig.daysOfWeek.length === 0
        ) {
          errors.push('At least one day of week must be selected');
        } else {
          const validDays = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ];
          const invalidDays = scheduling.intervalConfig.daysOfWeek.filter(
            (day) => !validDays.includes(day.toLowerCase())
          );
          if (invalidDays.length > 0) {
            errors.push(`Invalid days: ${invalidDays.join(', ')}`);
          }
        }
        break;

      case 'monthly':
        if (!scheduling.intervalConfig) {
          errors.push('Interval configuration is required for monthly scheduling');
        } else {
          const dayOfMonth = scheduling.intervalConfig.dayOfMonth;
          if (!dayOfMonth) {
            errors.push('Day of month is required');
          } else if (dayOfMonth !== 'last' && (dayOfMonth < 1 || dayOfMonth > 31)) {
            errors.push('Day of month must be between 1 and 31 or "last"');
          }
        }
        break;

      case 'custom':
        if (!scheduling.intervalConfig) {
          errors.push('Interval configuration is required for custom scheduling');
        } else {
          const intervalMs = scheduling.intervalConfig.customIntervalMs;
          if (!intervalMs) {
            errors.push('Custom interval duration is required');
          } else {
            const { MIN_CUSTOM_INTERVAL_MS, MAX_CUSTOM_INTERVAL_MS } = TEMPLATE_CONSTANTS.INTERVALS;

            if (intervalMs < MIN_CUSTOM_INTERVAL_MS) {
              errors.push(`Interval must be at least ${MIN_CUSTOM_INTERVAL_MS / 60000} minutes`);
            }

            if (intervalMs > MAX_CUSTOM_INTERVAL_MS) {
              errors.push(
                `Interval cannot exceed ${MAX_CUSTOM_INTERVAL_MS / (24 * 60 * 60000)} days`
              );
            }
          }
        }
        break;

      default:
        errors.push(`Unknown scheduling interval: ${scheduling.interval}`);
    }

    // Validate date range
    if (scheduling.startDate && scheduling.endDate) {
      if (scheduling.endDate <= scheduling.startDate) {
        errors.push('End date must be after start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Validates tags array
 */
class TagsValidator implements Validator {
  validate(value: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(value)) {
      errors.push('Tags must be an array');
      return { isValid: false, errors };
    }

    const { MAX_TAGS_PER_TEMPLATE, MAX_TAG_LENGTH } = TEMPLATE_CONSTANTS.LIMITS;

    if (value.length > MAX_TAGS_PER_TEMPLATE) {
      warnings.push(`Only first ${MAX_TAGS_PER_TEMPLATE} tags will be kept`);
    }

    for (const tag of value) {
      if (typeof tag !== 'string') {
        errors.push('All tags must be strings');
        continue;
      }

      if (tag.trim().length === 0) {
        warnings.push('Empty tags will be removed');
        continue;
      }

      if (tag.length > MAX_TAG_LENGTH) {
        errors.push(`Tag "${tag}" exceeds maximum length of ${MAX_TAG_LENGTH} characters`);
      }

      if (!/^[\w\s\-]+$/.test(tag)) {
        errors.push(`Tag "${tag}" contains invalid characters`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
