import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for SET_TEMPLATE_SCHEDULING messages.
 * Sets or updates template scheduling configuration.
 */
export class SetTemplateSchedulingHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.SET_TEMPLATE_SCHEDULING>
> {
  readonly action = MessageAction.SET_TEMPLATE_SCHEDULING;

  protected validate(message: ExtractMessageByAction<MessageAction.SET_TEMPLATE_SCHEDULING>) {
    if (!message.payload?.templateId) {
      return { isValid: false, error: 'Template ID is required' };
    }
    if (!message.payload?.scheduling) {
      return { isValid: false, error: 'Scheduling configuration is required' };
    }
    return { isValid: true };
  }

  protected async execute(
    message: ExtractMessageByAction<MessageAction.SET_TEMPLATE_SCHEDULING>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    try {
      const { templateId, scheduling } = message.payload;

      deps.logger.info('SetTemplateSchedulingHandler: Starting', {
        templateId,
        scheduling,
      });

      // First, update the template's scheduling configuration
      await deps.templateManager.setTemplateScheduling(templateId, scheduling);
      deps.logger.info('SetTemplateSchedulingHandler: Template scheduling updated in storage');

      // Then, if scheduling is enabled, create/update the Chrome alarm
      if (scheduling.enabled && !scheduling.paused) {
        // Get the updated template with calculated nextExecution
        const template = await deps.templateManager.getTemplate(templateId);
        if (template) {
          deps.logger.info('SetTemplateSchedulingHandler: Creating alarm', {
            templateId,
            templateScheduling: template.scheduling,
          });

          await deps.schedulingEngine.scheduleTemplate(template);
          deps.logger.info('Template scheduling set and alarm created', {
            templateId,
            nextExecution: template.scheduling?.nextExecution,
          });
        } else {
          deps.logger.warn('SetTemplateSchedulingHandler: Template not found after update', {
            templateId,
          });
        }
      } else {
        // If scheduling is disabled or paused, cancel any existing alarm
        await deps.schedulingEngine.cancelTemplateAlarm(templateId);
        deps.logger.info('Template scheduling set, alarm cancelled', {
          templateId,
          enabled: scheduling.enabled,
          paused: scheduling.paused,
        });
      }

      return createSuccessResponse();
    } catch (error) {
      deps.logger.error('SetTemplateSchedulingHandler: Error', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
