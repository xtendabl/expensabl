import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for UPDATE_TEMPLATE messages.
 * Updates an existing template.
 */
export class UpdateTemplateHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE>
> {
  readonly action = MessageAction.UPDATE_TEMPLATE;

  protected validate(message: ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    if (!message.payload?.updates) {
      return { isValid: false, error: 'Update data is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const updatedTemplate = await deps.templateManager.updateTemplate(
      message.payload.templateId,
      message.payload.updates
    );

    deps.logger.info('Template updated successfully', {
      templateId: message.payload.templateId,
    });

    return createSuccessResponse(updatedTemplate);
  }
}
