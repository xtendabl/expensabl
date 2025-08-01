import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for PAUSE_TEMPLATE_SCHEDULING messages.
 * Pauses scheduling for a template.
 */
export class PauseTemplateSchedulingHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.PAUSE_TEMPLATE_SCHEDULING>
> {
  readonly action = MessageAction.PAUSE_TEMPLATE_SCHEDULING;

  protected validate(message: ExtractMessageByAction<MessageAction.PAUSE_TEMPLATE_SCHEDULING>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.PAUSE_TEMPLATE_SCHEDULING>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const { templateId } = message.payload;

    // Pause the scheduling in storage
    await deps.templateManager.pauseTemplateScheduling(templateId);

    // Cancel the Chrome alarm since it's paused
    await deps.schedulingEngine.cancelTemplateAlarm(templateId);

    deps.logger.info('Template scheduling paused and alarm cancelled', {
      templateId,
    });

    return createSuccessResponse();
  }
}
