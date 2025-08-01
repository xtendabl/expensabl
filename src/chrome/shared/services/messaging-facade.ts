import { Category, ExpenseStats } from '../../../features/expenses/manager-extended';
import {
  ExpenseCreatePayload,
  ExpenseData,
  ExpenseFilters,
} from '../../../features/expenses/types';
import { ValidationResult } from '../../../features/templates/types';
import {
  CreateTemplateRequest,
  ExpenseTemplate,
  TemplateScheduling,
  UpdateTemplateRequest,
} from '../../../features/templates/types';
// Token types will be defined inline as they don't exist in auth/types
interface TokenStatus {
  hasToken: boolean;
  isValid: boolean;
  expiresAt?: number;
}

interface TokenData {
  token: string;
  expiresAt: number;
}

/**
 * Search parameters for expense queries
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  filters?: ExpenseFilters;
}

/**
 * Statistics parameters
 */
export interface StatsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'category';
}

/**
 * Token export data structure
 */
export interface TokenExportData {
  tokens: TokenData[];
  exportedAt: number;
  version: string;
}

/**
 * Auth statistics
 */
export interface AuthStatistics {
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  lastCaptured?: number;
}

/**
 * Message transport interface
 */
interface MessageTransport {
  send<T = unknown>(action: string, payload?: unknown): Promise<T>;
}

/**
 * Chrome runtime message transport implementation
 */
class ChromeMessageTransport implements MessageTransport {
  async send<T = unknown>(action: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action,
          ...(payload !== undefined && { payload }),
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error('No response received'));
            return;
          }

          if (!response.success) {
            reject(new Error(response.error || 'Unknown error'));
            return;
          }

          resolve(response.data as T);
        }
      );
    });
  }
}

/**
 * Facade for all backend messaging operations.
 * Provides a typed, promise-based interface to Chrome extension message handlers.
 */
export class MessagingFacade {
  private transport: MessageTransport;

  constructor(transport?: MessageTransport) {
    this.transport = transport || new ChromeMessageTransport();
  }

  /**
   * Expense-related operations
   */
  expenses = {
    /**
     * Fetches a paginated list of expenses
     */
    fetch: (params?: ExpenseFilters): Promise<ExpenseData[]> => {
      return this.transport.send<ExpenseData[]>('getExpenses', params);
    },

    /**
     * Fetches a single expense by ID
     */
    fetchOne: (id: string): Promise<ExpenseData> => {
      return this.transport.send<ExpenseData>('fetchExpense', { selectedTxn: { id } });
    },

    /**
     * Creates a new expense
     */
    create: (data: ExpenseCreatePayload): Promise<ExpenseData> => {
      return this.transport.send<ExpenseData>('createExpense', { expenseData: data });
    },

    /**
     * Searches expenses with advanced query
     */
    search: (query: SearchParams): Promise<ExpenseData[]> => {
      return this.transport.send<ExpenseData[]>('searchTransactions', query);
    },

    /**
     * Gets available expense categories
     */
    getCategories: (): Promise<Category[]> => {
      return this.transport.send<Category[]>('getExpenseCategories');
    },

    /**
     * Gets expense statistics
     */
    getStats: (params: StatsParams): Promise<ExpenseStats> => {
      return this.transport.send<ExpenseStats>('getExpenseStats', params);
    },

    /**
     * Validates expense data before creation
     */
    validate: (data: ExpenseCreatePayload): Promise<ValidationResult> => {
      return this.transport.send<ValidationResult>('validateExpenseData', { expenseData: data });
    },
  };

  /**
   * Template-related operations
   */
  templates = {
    /**
     * Lists all templates
     */
    list: (): Promise<ExpenseTemplate[]> => {
      return this.transport.send<ExpenseTemplate[]>('getTemplates');
    },

    /**
     * Creates a new template
     */
    create: (data: CreateTemplateRequest): Promise<ExpenseTemplate> => {
      return this.transport.send<ExpenseTemplate>('createTemplate', { templateData: data });
    },

    /**
     * Updates an existing template
     */
    update: (id: string, data: UpdateTemplateRequest): Promise<ExpenseTemplate> => {
      return this.transport.send<ExpenseTemplate>('updateTemplate', {
        templateId: id,
        templateData: data,
      });
    },

    /**
     * Deletes a template
     */
    delete: (id: string): Promise<void> => {
      return this.transport.send<void>('deleteTemplate', { templateId: id });
    },

    /**
     * Updates template usage count
     */
    updateUsage: (id: string): Promise<ExpenseTemplate> => {
      return this.transport.send<ExpenseTemplate>('updateTemplateUsage', { templateId: id });
    },

    /**
     * Schedules a template for automatic execution
     */
    schedule: (id: string, config: TemplateScheduling): Promise<void> => {
      return this.transport.send<void>('scheduleTemplate', { templateId: id, scheduling: config });
    },

    /**
     * Removes scheduling from a template
     */
    unschedule: (id: string): Promise<void> => {
      return this.transport.send<void>('unscheduleTemplate', { templateId: id });
    },

    /**
     * Pauses template scheduling
     */
    pauseSchedule: (id: string): Promise<void> => {
      return this.transport.send<void>('pauseTemplateScheduling', { templateId: id });
    },

    /**
     * Resumes template scheduling
     */
    resumeSchedule: (id: string): Promise<void> => {
      return this.transport.send<void>('resumeTemplateScheduling', { templateId: id });
    },
  };

  /**
   * Authentication-related operations
   */
  auth = {
    /**
     * Gets current token status
     */
    getTokenStatus: (): Promise<TokenStatus> => {
      return this.transport.send<TokenStatus>('getTokenStatus');
    },

    /**
     * Clears all stored tokens
     */
    clearTokens: (): Promise<void> => {
      return this.transport.send<void>('clearTokens');
    },

    /**
     * Exports tokens for backup
     */
    exportTokens: (): Promise<TokenExportData> => {
      return this.transport.send<TokenExportData>('exportTokens');
    },

    /**
     * Imports tokens from backup
     */
    importTokens: (data: TokenExportData): Promise<boolean> => {
      return this.transport.send<boolean>('importTokens', data);
    },

    /**
     * Gets authentication statistics
     */
    getStatistics: (): Promise<AuthStatistics> => {
      return this.transport.send<AuthStatistics>('getStatistics');
    },
  };
}

// Export singleton instance
export const messagingFacade = new MessagingFacade();
