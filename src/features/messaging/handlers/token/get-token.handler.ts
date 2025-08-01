import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for GET_TOKEN messages.
 * Retrieves the current authentication token from TokenManager.
 */
export class GetTokenHandler extends BaseHandler<ExtractMessageByAction<MessageAction.GET_TOKEN>> {
  readonly action = MessageAction.GET_TOKEN;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.GET_TOKEN>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const token = await deps.tokenManager.get();
    return createSuccessResponse({ token });
  }
}
