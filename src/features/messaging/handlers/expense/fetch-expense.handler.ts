import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for FETCH_EXPENSE messages.
 * Fetches a single expense by ID.
 */
export class FetchExpenseHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.FETCH_EXPENSE>
> {
  readonly action = MessageAction.FETCH_EXPENSE;

  protected validate(message: ExtractMessageByAction<MessageAction.FETCH_EXPENSE>) {
    if (!message.payload?.expenseId) {
      return { isValid: false, error: 'Expense ID is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.FETCH_EXPENSE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const expense = await deps.expenseManager.fetchExpense(message.payload.expenseId);
    deps.logger.debug('Expense fetched successfully', { expenseId: message.payload.expenseId });
    return createSuccessResponse(expense);
  }
}
