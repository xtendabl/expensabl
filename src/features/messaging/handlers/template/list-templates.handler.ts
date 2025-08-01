import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for LIST_TEMPLATES messages.
 * Lists templates with optional pagination and filtering.
 */
export class ListTemplatesHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.LIST_TEMPLATES>
> {
  readonly action = MessageAction.LIST_TEMPLATES;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.LIST_TEMPLATES>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const templates = await deps.templateManager.listTemplates(message.payload);

    deps.logger.debug('Templates listed successfully', {
      count: templates.items?.length || 0,
      hasOptions: !!message.payload,
    });

    return createSuccessResponse(templates);
  }
}
