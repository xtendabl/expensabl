import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  createErrorResponse,
  HandlerDependencies,
} from '../../types';

/**
 * Handler for SAVE_TOKEN messages.
 * Saves authentication tokens captured from content scripts.
 */
export class SaveTokenHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.SAVE_TOKEN>
> {
  readonly action = MessageAction.SAVE_TOKEN;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.SAVE_TOKEN>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    const { token, source, url } = message.payload;

    // Validate the token comes from a trusted source
    if (sender.tab && sender.tab.url && !sender.tab.url.includes('app.navan.com')) {
      deps.logger.warn('Token save attempted from untrusted source', {
        tabUrl: sender.tab.url,
        source,
      });
      return createErrorResponse('Token must be captured from Navan website');
    }

    try {
      // Save the token using the auth manager
      const success = await deps.tokenManager.save(token, `${source} (${url || 'unknown'})`);

      if (success) {
        deps.logger.info('Token saved successfully', {
          source,
          url,
          tokenPreview: token.substring(0, 20) + '...',
        });

        // Show notification to user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'expensabl-icon.png',
          title: 'Authentication Successful',
          message: 'Navan authentication token captured. You can now use the expense features.',
        });

        return createSuccessResponse({ saved: true });
      } else {
        deps.logger.warn('Token validation failed', {
          source,
          url,
        });
        return createErrorResponse('Invalid token format');
      }
    } catch (error) {
      deps.logger.error('Failed to save token', {
        error,
        source,
        url,
      });
      return createErrorResponse('Failed to save token');
    }
  }
}
