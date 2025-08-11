import { ExpenseCreatePayload } from '../features/expenses/types';
import {
  BackgroundMessage,
  MessageAction,
  ReceiptAttachPayload,
} from '../features/messaging/types';
import { TemplateExecution, TemplateScheduling } from '../features/templates/types';
import { info, warn } from '../shared/services/logger/chrome-logger-setup';

export interface UIMessage {
  action: string;
  selectedTxn?: { id: string };
  data?: unknown;
  filters?: Record<string, string>; // For search operations
  payload?: {
    expenseId?: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    data?: ArrayBuffer | string;
    isBase64?: boolean;
    receiptKey?: string;
    [key: string]: unknown;
  };
  template?: {
    id?: string; // Optional for create operations
    name: string;
    expenseData: unknown;
    scheduling?: TemplateScheduling | null;
    executionHistory?: TemplateExecution[];
  };
  templateId?: string;
  schedule?: {
    enabled: boolean;
    recurrence?: string;
    time?: string;
    weeklyDays?: number[];
    monthlyDay?: number;
    customIntervalMs?: number;
  };
  tokens?: unknown;
}

interface BackendResponse {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Adapter to transform UI messages to our typed backend messages
 * Maps between the reference UI message format and our MessageAction enum
 */
export class MessageAdapter {
  // Documenting due to complex message action mapping logic
  /**
   * Transforms UI messages to strongly-typed backend messages with validation.
   * Maps loosely-typed UI actions to MessageAction enum values.
   *
   * @param uiMessage - The UI message with action and optional payload
   * @returns Typed backend message or null if validation fails
   *
   * @remarks
   * Transformation features:
   * - **Validation**: Ensures required fields exist for each action
   * - **Type safety**: Converts untyped payloads to specific interfaces
   * - **Scheduling logic**: Complex interval configuration for templates
   * - **Null safety**: Returns null for invalid/incomplete messages
   *
   * Notable transformations:
   * - `updateSchedule`: Builds complex TemplateScheduling from flat UI data
   * - `submitExpense`: Casts generic data to ExpenseCreatePayload
   * - `updateTemplate`: Merges multiple fields into update payload
   *
   * @example
   * ```typescript
   * const msg = MessageAdapter.transformRequest({
   *   action: 'updateSchedule',
   *   templateId: '123',
   *   schedule: {
   *     enabled: true,
   *     recurrence: 'weekly',
   *     weeklyDays: [1, 3, 5], // Mon, Wed, Fri
   *     time: '09:30'
   *   }
   * });
   * // Returns: { action: SET_TEMPLATE_SCHEDULING, payload: {...} }
   * ```
   */
  static transformRequest(uiMessage: UIMessage): BackgroundMessage | null {
    switch (uiMessage.action) {
      // Token operations
      case 'checkAuth':
        return { action: MessageAction.GET_TOKEN_STATUS };

      case 'clearAuth':
        return { action: MessageAction.CLEAR_TOKENS };

      // Expense operations
      case 'fetchExpense':
        // Support both selectedTxn.id and direct payload.expenseId
        if (uiMessage.payload?.expenseId) {
          return {
            action: MessageAction.FETCH_EXPENSE,
            payload: { expenseId: uiMessage.payload.expenseId },
          };
        } else if (uiMessage.selectedTxn?.id) {
          return {
            action: MessageAction.FETCH_EXPENSE,
            payload: { expenseId: uiMessage.selectedTxn.id },
          };
        }
        return null;

      case 'getExpenses':
        return {
          action: MessageAction.FETCH_EXPENSES,
          payload: uiMessage.filters,
        };

      case 'searchExpenses':
        return {
          action: MessageAction.FETCH_EXPENSES,
          payload: uiMessage.filters,
        };

      case 'submitExpense':
      case 'createExpense':
        if (!uiMessage.data && !uiMessage.payload) {
          return null;
        }
        return {
          action: MessageAction.CREATE_EXPENSE,
          payload: (uiMessage.data || uiMessage.payload) as ExpenseCreatePayload,
        };

      case 'attachReceipt':
        if (!uiMessage.payload) {
          return null;
        }
        return {
          action: MessageAction.ATTACH_RECEIPT,
          payload: uiMessage.payload as ReceiptAttachPayload,
        };

      case 'deleteReceipt':
        if (!uiMessage.payload) {
          return null;
        }
        return {
          action: MessageAction.DELETE_RECEIPT,
          payload: uiMessage.payload as { expenseId: string; receiptKey: string },
        };

      case 'getReceiptUrl':
        if (!uiMessage.payload?.receiptKey) {
          return null;
        }
        return {
          action: MessageAction.GET_RECEIPT_URL,
          payload: { receiptKey: uiMessage.payload.receiptKey },
        };

      // Template operations
      case 'getTemplates':
        return { action: MessageAction.LIST_TEMPLATES };

      case 'createTemplate':
        if (!uiMessage.template) {
          return null;
        }
        return {
          action: MessageAction.CREATE_TEMPLATE,
          payload: {
            name: uiMessage.template.name,
            expenseData: uiMessage.template.expenseData as Partial<ExpenseCreatePayload>,
            createdFrom: 'manual',
          },
        };

      case 'updateTemplate':
        if (!uiMessage.template || !uiMessage.template.id) {
          return null;
        }
        return {
          action: MessageAction.UPDATE_TEMPLATE,
          payload: {
            templateId: uiMessage.template.id,
            updates: {
              name: uiMessage.template.name,
              expenseData: uiMessage.template.expenseData as Partial<ExpenseCreatePayload>,
              scheduling: uiMessage.template.scheduling || null,
              executionHistory: uiMessage.template.executionHistory,
            },
          },
        };

      case 'deleteTemplate':
        if (!uiMessage.templateId) {
          return null;
        }
        return {
          action: MessageAction.DELETE_TEMPLATE,
          payload: { templateId: uiMessage.templateId },
        };

      case 'updateTemplateUsage':
        if (!uiMessage.templateId) {
          return null;
        }
        return {
          action: MessageAction.UPDATE_TEMPLATE_USAGE,
          payload: { templateId: uiMessage.templateId },
        };

      // Schedule operations
      case 'updateSchedule':
        if (!uiMessage.templateId) {
          return null;
        }
        if (uiMessage.schedule?.enabled) {
          const interval =
            uiMessage.schedule.recurrence === 'daily'
              ? 'daily'
              : uiMessage.schedule.recurrence === 'weekly'
                ? 'weekly'
                : uiMessage.schedule.recurrence === 'monthly'
                  ? 'monthly'
                  : 'custom';

          // Build intervalConfig based on interval type
          const intervalConfig: {
            daysOfWeek?: string[];
            dayOfMonth?: number | 'last';
            customIntervalMs?: number;
          } = {};

          if (interval === 'weekly') {
            intervalConfig.daysOfWeek = uiMessage.schedule.weeklyDays?.map((day: number) => {
              const days = [
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
              ];
              return days[day];
            }) || ['monday']; // Default to Monday if no days specified
          } else if (interval === 'monthly') {
            // Use nullish coalescing to properly handle undefined
            intervalConfig.dayOfMonth = uiMessage.schedule.monthlyDay ?? 1;
          } else if (interval === 'custom') {
            // Handle custom interval from schedule field
            intervalConfig.customIntervalMs = uiMessage.schedule.customIntervalMs ?? 5 * 60 * 1000; // Default to 5 minutes
          }

          info('[MessageAdapter] Creating scheduling with intervalConfig:', intervalConfig);

          return {
            action: MessageAction.SET_TEMPLATE_SCHEDULING,
            payload: {
              templateId: uiMessage.templateId,
              scheduling: {
                enabled: true,
                paused: false,
                interval,
                executionTime: {
                  hour: parseInt(uiMessage.schedule.time?.split(':')[0] || '9'),
                  minute: parseInt(uiMessage.schedule.time?.split(':')[1] || '0'),
                },
                intervalConfig,
              } as TemplateScheduling,
            },
          };
        } else {
          return {
            action: MessageAction.REMOVE_TEMPLATE_SCHEDULING,
            payload: { templateId: uiMessage.templateId },
          };
        }

      case 'pauseSchedule':
        if (!uiMessage.templateId) {
          return null;
        }
        return {
          action: MessageAction.PAUSE_TEMPLATE_SCHEDULING,
          payload: { templateId: uiMessage.templateId },
        };

      case 'resumeSchedule':
        if (!uiMessage.templateId) {
          return null;
        }
        return {
          action: MessageAction.RESUME_TEMPLATE_SCHEDULING,
          payload: { templateId: uiMessage.templateId },
        };

      // UI operations
      case 'openSidePanel':
        return { action: MessageAction.OPEN_SIDE_PANEL };

      case 'exportTokens':
        return { action: MessageAction.EXPORT_TOKENS };

      case 'importTokens':
        if (!uiMessage.tokens) {
          return null;
        }
        return {
          action: MessageAction.IMPORT_TOKENS,
          payload: { tokens: uiMessage.tokens as Record<string, string> },
        };

      case 'getStatistics':
        return { action: MessageAction.GET_STATISTICS };

      default:
        // Unknown UI action
        warn('Unknown UI action:', uiMessage.action);
        return null;
    }
  }

  // Documenting due to response normalization for UI consumption
  /**
   * Transforms backend responses to UI-friendly format with consistent structure.
   * Normalizes different response types for the UI layer.
   *
   * @param action - The original UI action that triggered the request
   * @param response - The backend response with success/error status
   * @returns Normalized response object for UI consumption
   *
   * @remarks
   * Normalization features:
   * - **Error handling**: Consistent error format across all actions
   * - **Data extraction**: Unwraps nested response data
   * - **Default values**: Provides safe defaults for missing data
   * - **Action-specific**: Custom response format per action type
   *
   * Response patterns:
   * - Auth checks: Returns `hasToken` and `isValid` booleans
   * - List operations: Extracts `items` array with fallback to empty
   * - Single entities: Unwraps data object directly
   * - Unknown actions: Passes through raw response
   *
   * @example
   * ```typescript
   * const uiResponse = MessageAdapter.transformResponse('getTemplates', {
   *   success: true,
   *   data: { items: [template1, template2] }
   * });
   * // Returns: { success: true, templates: [template1, template2] }
   * ```
   */
  static transformResponse(action: string, response: BackendResponse): Record<string, unknown> {
    if (!response.success) {
      return {
        success: false,
        error: response.error,
      };
    }

    switch (action) {
      case 'checkAuth':
        return {
          success: true,
          hasToken: response.data?.hasToken || false,
          isValid: response.data?.isValid || false,
        };

      case 'fetchExpense':
        return {
          success: true,
          expense: response.data,
        };

      case 'getExpenses':
        return {
          success: true,
          expenses: response.data?.items || [],
        };

      case 'searchExpenses':
        return {
          success: true,
          expenses: response.data?.items || [],
        };

      case 'getTemplates':
        return {
          success: true,
          templates: response.data?.items || [],
        };

      case 'getStatistics':
        return {
          success: true,
          stats: response.data,
        };

      default:
        return {
          ...response,
          success: response.success,
          error: response.error,
          data: response.data,
        };
    }
  }
}
