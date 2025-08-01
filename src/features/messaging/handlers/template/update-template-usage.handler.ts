import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
} from '../../types';
import { ExpenseTemplate } from '../../../templates/types';

/**
 * Handler for updating template usage count
 */
export class UpdateTemplateUsageHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE_USAGE>
> {
  readonly action = MessageAction.UPDATE_TEMPLATE_USAGE;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE_USAGE>,
    _sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse<ExpenseTemplate>> {
    const { templateId } = message.payload;

    deps.logger.info('UpdateTemplateUsageHandler: Updating template usage', {
      templateId,
    });

    try {
      const template = await deps.templateManager.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Update metadata
      const updatedTemplate = await deps.templateManager.updateTemplate(templateId, {
        ...template,
        metadata: {
          ...template.metadata,
          useCount: (template.metadata?.useCount || 0) + 1,
          lastUsed: Date.now(),
        },
      });

      deps.logger.info('UpdateTemplateUsageHandler: Template usage updated', {
        templateId,
        newCount: updatedTemplate.metadata?.useCount,
      });

      return createSuccessResponse(updatedTemplate);
    } catch (error) {
      deps.logger.error('UpdateTemplateUsageHandler: Failed to update usage', { error });
      throw error;
    }
  }

  protected validate(message: ExtractMessageByAction<MessageAction.UPDATE_TEMPLATE_USAGE>): {
    isValid: boolean;
    error?: string;
  } {
    if (!message.payload || typeof message.payload !== 'object') {
      return { isValid: false, error: 'Invalid payload' };
    }

    if (!message.payload.templateId || typeof message.payload.templateId !== 'string') {
      return { isValid: false, error: 'Template ID is required' };
    }

    return { isValid: true };
  }
}
