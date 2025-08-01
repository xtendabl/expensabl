import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for FETCH_EXPENSES messages.
 * Fetches multiple expenses with optional filtering.
 */
export class FetchExpensesHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.FETCH_EXPENSES>
> {
  readonly action = MessageAction.FETCH_EXPENSES;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.FETCH_EXPENSES>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const expenses = await deps.expenseManager.fetchExpenses(message.payload);

    deps.logger.debug('Expenses fetched successfully', {
      count: expenses.data?.length || 0,
      hasFilters: !!message.payload,
    });

    return createSuccessResponse(expenses);
  }
}
