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
/**
 * Receipt operation payloads - simplified inline types
 */
export interface ReceiptAttachPayload {
  expenseId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer | string; // ArrayBuffer in service worker, base64 string from UI
  isBase64?: boolean; // Flag to indicate if data is base64 encoded
}

export interface ReceiptDeletePayload {
  expenseId: string;
  receiptKey: string;
}

export interface ReceiptUrlPayload {
  receiptKey: string;
}

/**
 * Receipt message types - using simplified payload types
 */
export interface AttachReceiptMessage {
  action: MessageAction.ATTACH_RECEIPT;
  payload: ReceiptAttachPayload;
}

export interface DeleteReceiptMessage {
  action: MessageAction.DELETE_RECEIPT;
  payload: ReceiptDeletePayload;
}

export interface GetReceiptUrlMessage {
  action: MessageAction.GET_RECEIPT_URL;
  payload: ReceiptUrlPayload;
}

/**
 * Receipt operation responses
 */
export interface ReceiptAttachResponse {
  receiptKey: string;
}

export interface ReceiptUrlResponse {
  url: string;
}

// Backward compatibility aliases
export type AttachReceiptPayload = ReceiptAttachPayload;
export type AttachReceiptResponse = ReceiptAttachResponse;

export enum MessageAction {
  // Token Operations (4 actions) - verified against actual TokenManager methods
  GET_TOKEN = 'getToken', // tokenManager.get(): Promise<string | null>
  CLEAR_TOKENS = 'clearTokens', // tokenManager.clear(): Promise<void>
  GET_TOKEN_STATUS = 'getTokenStatus', // combination of get() + isValid()
  SAVE_TOKEN = 'saveToken', // tokenManager.save(token, source): Promise<boolean>

  // Expense Operations (5 actions) - verified against actual ExpenseManager methods
  FETCH_EXPENSE = 'fetchExpense', // expenseManager.fetchExpense(id): Promise<NavanExpenseData>
  FETCH_EXPENSES = 'fetchExpenses', // expenseManager.fetchExpenses(filters): Promise<ExpenseListResponse>
  CREATE_EXPENSE = 'createExpense', // expenseManager.createExpense(data): Promise<NavanExpenseData>
  SUBMIT_DRAFT_EXPENSE = 'submitDraftExpense', // expenseManager.submitDraftExpense(id): Promise<NavanExpenseData>
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

  // Receipt Operations
  ATTACH_RECEIPT = 'attachReceipt', // Attach receipt to expense
  DELETE_RECEIPT = 'deleteReceipt', // Delete receipt from expense
  GET_RECEIPT_URL = 'getReceiptUrl', // Get presigned URL for viewing receipt

  // Testing Operations
  TEST_API_PARAMETERS = 'testApiParameters', // Test which query parameters are supported by the API
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
  | { action: MessageAction.SUBMIT_DRAFT_EXPENSE; payload: { expenseId: string } }
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
  | { action: MessageAction.UPDATE_TEMPLATE_USAGE; payload: { templateId: string } }

  // Receipt operations
  | AttachReceiptMessage
  | DeleteReceiptMessage
  | GetReceiptUrlMessage

  // Testing operations
  | { action: MessageAction.TEST_API_PARAMETERS };

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
import { ReceiptUploadResult } from '../expenses/services/expense-operations';

export interface HandlerDependencies {
  tokenManager: typeof tokenManager; // Existing singleton instance (export const tokenManager)
  expenseManager: typeof extendedExpenseManager; // Existing singleton instance with extended features
  templateManager: TemplateManager; // Existing singleton (TemplateManager.getInstance())
  logger: typeof logger; // Logger functions (info, error, debug, warn)
  schedulingEngine: SchedulingEngine; // Scheduling engine for managing template alarms
  receiptService: {
    uploadReceipt(expenseId: string, formData: FormData): Promise<ReceiptUploadResult>;
    deleteReceipt(expenseId: string, receiptKey: string): Promise<void>;
    getReceiptUrl(receiptKey: string): Promise<string>;
  }; // Receipt service interface (now part of expense manager)
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
