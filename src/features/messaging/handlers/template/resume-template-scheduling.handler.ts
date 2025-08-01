import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for RESUME_TEMPLATE_SCHEDULING messages.
 * Resumes scheduling for a template.
 */
export class ResumeTemplateSchedulingHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.RESUME_TEMPLATE_SCHEDULING>
> {
  readonly action = MessageAction.RESUME_TEMPLATE_SCHEDULING;

  protected validate(message: ExtractMessageByAction<MessageAction.RESUME_TEMPLATE_SCHEDULING>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.RESUME_TEMPLATE_SCHEDULING>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const { templateId } = message.payload;

    // Resume the scheduling in storage (recalculates nextExecution)
    await deps.templateManager.resumeTemplateScheduling(templateId);

    // Get the updated template and create alarm if enabled
    const template = await deps.templateManager.getTemplate(templateId);
    if (template && template.scheduling?.enabled) {
      await deps.schedulingEngine.scheduleTemplate(template);
      deps.logger.info('Template scheduling resumed and alarm created', {
        templateId,
        nextExecution: template.scheduling.nextExecution,
      });
    } else {
      deps.logger.info('Template scheduling resumed (no alarm needed)', {
        templateId,
      });
    }

    return createSuccessResponse();
  }
}
