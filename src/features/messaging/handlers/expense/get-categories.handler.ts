import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for GET_EXPENSE_CATEGORIES messages.
 * Fetches available expense categories.
 */
export class GetCategoriesHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.GET_EXPENSE_CATEGORIES>
> {
  readonly action = MessageAction.GET_EXPENSE_CATEGORIES;

  protected validate(_message: ExtractMessageByAction<MessageAction.GET_EXPENSE_CATEGORIES>) {
    // No payload validation needed for this handler
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.GET_EXPENSE_CATEGORIES>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    deps.logger.info('GetCategoriesHandler: Fetching expense categories');

    const categories = await deps.expenseManager.getCategories();

    deps.logger.info('GetCategoriesHandler: Categories fetched', {
      count: categories.length,
    });

    return createSuccessResponse(categories);
  }
}
