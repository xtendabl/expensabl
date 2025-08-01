import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for CLEAR_TOKENS messages.
 * Clears all stored authentication tokens.
 */
export class ClearTokensHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.CLEAR_TOKENS>
> {
  readonly action = MessageAction.CLEAR_TOKENS;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.CLEAR_TOKENS>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    await deps.tokenManager.clear();
    deps.logger.info('Tokens cleared successfully');
    return createSuccessResponse();
  }
}
