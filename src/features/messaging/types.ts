import { ExpenseCreatePayload, ExpenseFilters } from '../expenses/types';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateScheduling,
  ListOptions,
} from '../templates/types';
import { tokenManager } from '../auth/manager';
import { extendedExpenseManager } from '../expenses/manager-extended';
import { TemplateManager } from '../templates/manager';
import { SchedulingEngine } from '../templates/scheduling-engine';
import { chromeLogger as logger } from '../../shared/services/logger/chrome-logger-setup';

// Realistic message actions based on actual service methods
export enum MessageAction {
  // Token Operations (4 actions) - verified against actual TokenManager methods
  GET_TOKEN = 'getToken', // tokenManager.get(): Promise<string | null>
  CLEAR_TOKENS = 'clearTokens', // tokenManager.clear(): Promise<void>
  GET_TOKEN_STATUS = 'getTokenStatus', // combination of get() + isValid()
  SAVE_TOKEN = 'saveToken', // tokenManager.save(token, source): Promise<boolean>

  // Expense Operations (4 actions) - verified against actual ExpenseManager methods
  FETCH_EXPENSE = 'fetchExpense', // expenseManager.fetchExpense(id): Promise<NavanExpenseData>
  FETCH_EXPENSES = 'fetchExpenses', // expenseManager.fetchExpenses(filters): Promise<ExpenseListResponse>
  CREATE_EXPENSE = 'createExpense', // expenseManager.createExpense(data): Promise<NavanExpenseData>
  GET_EXPENSE_CATEGORIES = 'getExpenseCategories', // Get available expense categories

  // Template Operations (4 actions) - verified against actual TemplateManager methods
  LIST_TEMPLATES = 'listTemplates', // templateManager.listTemplates(): Promise<ListResult<ExpenseTemplate>>
  CREATE_TEMPLATE = 'createTemplate', // templateManager.createTemplate(request): Promise<ExpenseTemplate>
  UPDATE_TEMPLATE = 'updateTemplate', // templateManager.updateTemplate(): Promise<ExpenseTemplate>
  DELETE_TEMPLATE = 'deleteTemplate', // templateManager.deleteTemplate(id): Promise<void>

  // Scheduling Operations (4 actions) - verified against actual TemplateManager methods
  SET_TEMPLATE_SCHEDULING = 'setTemplateScheduling', // templateManager.setTemplateScheduling(id, config)
  REMOVE_TEMPLATE_SCHEDULING = 'removeTemplateScheduling', // templateManager.removeTemplateScheduling(id)
  PAUSE_TEMPLATE_SCHEDULING = 'pauseTemplateScheduling', // templateManager.pauseTemplateScheduling(id)
  RESUME_TEMPLATE_SCHEDULING = 'resumeTemplateScheduling', // templateManager.resumeTemplateScheduling(id)

  // Additional UI Operations (5 actions) - required for UI implementation
  OPEN_SIDE_PANEL = 'openSidePanel', // chrome.sidePanel.open()
  EXPORT_TOKENS = 'exportTokens', // Export tokens to JSON
  IMPORT_TOKENS = 'importTokens', // Import tokens from JSON
  GET_STATISTICS = 'getStatistics', // Get expense/template statistics
  UPDATE_TEMPLATE_USAGE = 'updateTemplateUsage', // Track manual template usage
}

export type BackgroundMessage =
  // Token operations
  | { action: MessageAction.GET_TOKEN }
  | { action: MessageAction.CLEAR_TOKENS }
  | { action: MessageAction.GET_TOKEN_STATUS }
  | { action: MessageAction.SAVE_TOKEN; payload: { token: string; source: string; url?: string } }

  // Expense operations
  | { action: MessageAction.FETCH_EXPENSE; payload: { expenseId: string } }
  | { action: MessageAction.CREATE_EXPENSE; payload: ExpenseCreatePayload }
  | { action: MessageAction.FETCH_EXPENSES; payload?: ExpenseFilters }
  | { action: MessageAction.GET_EXPENSE_CATEGORIES }

  // Template operations
  | { action: MessageAction.CREATE_TEMPLATE; payload: CreateTemplateRequest }
  | {
      action: MessageAction.UPDATE_TEMPLATE;
      payload: { templateId: string; updates: UpdateTemplateRequest };
    }
  | { action: MessageAction.DELETE_TEMPLATE; payload: { templateId: string } }
  | { action: MessageAction.LIST_TEMPLATES; payload?: ListOptions }

  // Scheduling operations
  | {
      action: MessageAction.SET_TEMPLATE_SCHEDULING;
      payload: { templateId: string; scheduling: TemplateScheduling };
    }
  | { action: MessageAction.REMOVE_TEMPLATE_SCHEDULING; payload: { templateId: string } }
  | { action: MessageAction.PAUSE_TEMPLATE_SCHEDULING; payload: { templateId: string } }
  | { action: MessageAction.RESUME_TEMPLATE_SCHEDULING; payload: { templateId: string } }

  // Additional UI operations
  | { action: MessageAction.OPEN_SIDE_PANEL }
  | { action: MessageAction.EXPORT_TOKENS }
  | { action: MessageAction.IMPORT_TOKENS; payload: { tokens: Record<string, string> } }
  | { action: MessageAction.GET_STATISTICS }
  | { action: MessageAction.UPDATE_TEMPLATE_USAGE; payload: { templateId: string } };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export type MessageHandler<T extends BackgroundMessage = BackgroundMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  dependencies: HandlerDependencies
) => Promise<MessageResponse>;

/**
 * Dependency injection container for handler functions.
 * Uses actual service patterns from the codebase.
 *
 * This pattern allows handlers to be testable and decoupled from direct service imports.
 *
 * Instead of handlers directly importing services like:
 *   import { tokenManager } from '../asset/token-manager';
 *
 * Handlers receive services through the dependencies parameter:
 *   const token = await deps.tokenManager.get();
 */
export interface HandlerDependencies {
  tokenManager: typeof tokenManager; // Existing singleton instance (export const tokenManager)
  expenseManager: typeof extendedExpenseManager; // Existing singleton instance with extended features
  templateManager: TemplateManager; // Existing singleton (TemplateManager.getInstance())
  logger: typeof logger; // Logger functions (info, error, debug, warn)
  schedulingEngine: SchedulingEngine; // Scheduling engine for managing template alarms
}

// Type guards for message validation
export function isValidMessage(message: unknown): message is BackgroundMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'action' in message &&
    typeof (message as Record<string, unknown>).action === 'string' &&
    Object.values(MessageAction).includes(
      (message as Record<string, unknown>).action as MessageAction
    )
  );
}

// Response builders
export function createSuccessResponse<T>(data?: T): MessageResponse<T> {
  return { success: true, data };
}

export function createErrorResponse(
  error: string,
  details?: Record<string, unknown>
): MessageResponse {
  return { success: false, error, details };
}

// Handler interfaces for the new base handler pattern
export interface IHandler {
  readonly action: MessageAction;
  handle(
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse>;
}

// Type helper to extract message type by action
export type ExtractMessageByAction<T extends MessageAction> = Extract<
  BackgroundMessage,
  { action: T }
>;

// Unsubscribe function type for transport
export type Unsubscribe = () => void;
