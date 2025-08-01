import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for REMOVE_TEMPLATE_SCHEDULING messages.
 * Removes scheduling from a template.
 */
export class RemoveTemplateSchedulingHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.REMOVE_TEMPLATE_SCHEDULING>
> {
  readonly action = MessageAction.REMOVE_TEMPLATE_SCHEDULING;

  protected validate(message: ExtractMessageByAction<MessageAction.REMOVE_TEMPLATE_SCHEDULING>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.REMOVE_TEMPLATE_SCHEDULING>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const { templateId } = message.payload;

    // Remove scheduling from storage
    await deps.templateManager.removeTemplateScheduling(templateId);

    // Cancel any existing alarm
    await deps.schedulingEngine.cancelTemplateAlarm(templateId);

    deps.logger.info('Template scheduling removed and alarm cancelled', {
      templateId,
    });

    return createSuccessResponse();
  }
}
