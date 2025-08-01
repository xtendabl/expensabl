import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for CREATE_TEMPLATE messages.
 * Creates a new expense template.
 */
export class CreateTemplateHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.CREATE_TEMPLATE>
> {
  readonly action = MessageAction.CREATE_TEMPLATE;

  protected validate(message: ExtractMessageByAction<MessageAction.CREATE_TEMPLATE>) {
    if (!message.payload) {
      return { isValid: false, error: 'Template data is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.CREATE_TEMPLATE>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const newTemplate = await deps.templateManager.createTemplate(message.payload);

    deps.logger.info('Template created successfully', {
      templateId: newTemplate.id,
      name: newTemplate.name,
    });

    return createSuccessResponse(newTemplate);
  }
}
