import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for SUBMIT_DRAFT_EXPENSE messages.
 * Submits a draft expense to move it out of draft state.
 */
export class SubmitDraftExpenseHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.SUBMIT_DRAFT_EXPENSE>
> {
  readonly action = MessageAction.SUBMIT_DRAFT_EXPENSE;

  protected validate(message: ExtractMessageByAction<MessageAction.SUBMIT_DRAFT_EXPENSE>) {
    if (!message.payload?.expenseId) {
      return { isValid: false, error: 'Expense ID is required' };
    }

    const expenseId = message.payload.expenseId.trim();
    if (!expenseId) {
      return { isValid: false, error: 'Expense ID cannot be empty' };
    }

    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.SUBMIT_DRAFT_EXPENSE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const { expenseId } = message.payload;

    deps.logger.info('[SUBMIT_DRAFT_EXPENSE] Handler called', {
      expenseId,
      requestId: (message as any).requestId,
      timestamp: Date.now(),
    });

    // Submit the draft expense
    const submittedExpense = await deps.expenseManager.submitDraftExpense(expenseId);

    deps.logger.info('[SUBMIT_DRAFT_EXPENSE] Draft expense submitted successfully', {
      expenseId: submittedExpense.uuid || submittedExpense.id,
      status: submittedExpense.status,
      requestId: (message as any).requestId,
    });

    return createSuccessResponse(submittedExpense);
  }
}
