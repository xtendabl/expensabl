import { BaseHandler } from '../base-handler';
import {
  BackgroundMessage,
  MessageAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
  createErrorResponse,
} from '../../types';
import { ExpenseFilters } from '../../../expenses/types';

interface SearchExpensesMessage {
  action: MessageAction.FETCH_EXPENSES;
  payload?: ExpenseFilters;
}

/**
 * Handler for searching expenses with text query and filters
 */
export class SearchExpensesHandler extends BaseHandler<SearchExpensesMessage> {
  readonly action = MessageAction.FETCH_EXPENSES;

  protected validate(message: SearchExpensesMessage): { isValid: boolean; error?: string } {
    if (!message.payload) {
      // No payload means fetch all expenses
      return { isValid: true };
    }

    const payload = message.payload;

    // Validate date filters if present
    if (payload.dateFrom && !this.isValidDate(payload.dateFrom)) {
      return { isValid: false, error: 'Invalid dateFrom format' };
    }

    if (payload.dateTo && !this.isValidDate(payload.dateTo)) {
      return { isValid: false, error: 'Invalid dateTo format' };
    }

    if (payload.minAmount !== undefined && typeof payload.minAmount !== 'number') {
      return { isValid: false, error: 'minAmount must be a number' };
    }

    return { isValid: true };
  }

  protected async execute(
    message: SearchExpensesMessage,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse> {
    const payload = message.payload || {};

    deps.logger.info('SearchExpensesHandler: Fetching expenses', {
      hasFilters: !!message.payload,
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
    });

    try {
      const expenses = await deps.expenseManager.fetchExpenses(payload || {});

      deps.logger.info('SearchExpensesHandler: Fetch completed', {
        resultCount: expenses.data?.length || 0,
      });

      return createSuccessResponse({ items: expenses.data || [] });
    } catch (error) {
      deps.logger.error('SearchExpensesHandler: Failed to search expenses', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to search expenses'
      );
    }
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
