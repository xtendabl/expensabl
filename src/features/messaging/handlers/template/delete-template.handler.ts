import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for DELETE_TEMPLATE messages.
 * Deletes a template by ID.
 */
export class DeleteTemplateHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.DELETE_TEMPLATE>
> {
  readonly action = MessageAction.DELETE_TEMPLATE;

  protected validate(message: ExtractMessageByAction<MessageAction.DELETE_TEMPLATE>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.DELETE_TEMPLATE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    await deps.templateManager.deleteTemplate(message.payload.templateId);

    deps.logger.info('Template deleted successfully', {
      templateId: message.payload.templateId,
    });

    return createSuccessResponse();
  }
}
