import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for CREATE_EXPENSE messages.
 * Creates a new expense with the provided data.
 */
export class CreateExpenseHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.CREATE_EXPENSE>
> {
  readonly action = MessageAction.CREATE_EXPENSE;

  protected validate(message: ExtractMessageByAction<MessageAction.CREATE_EXPENSE>) {
    if (!message.payload) {
      return { isValid: false, error: 'Expense data is required' };
    }

    // Additional validation could be added here
    // e.g., checking required fields, data formats, etc.

    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.CREATE_EXPENSE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    // Log when handler is called
    deps.logger.info('[CREATE_EXPENSE] Handler called', {
      requestId: (message as any).requestId,
      timestamp: Date.now(),
      merchantAmount: message.payload?.merchantAmount,
      merchant: message.payload?.merchant?.name,
    });

    // Validation is already done by BaseHandler using validate()
    const newExpense = await deps.expenseManager.createExpense(message.payload);

    deps.logger.info('[CREATE_EXPENSE] Expense created successfully', {
      expenseId: newExpense.uuid || newExpense.id,
      amount: newExpense.merchantAmount,
      requestId: (message as any).requestId,
    });

    return createSuccessResponse(newExpense);
  }
}
