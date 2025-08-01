import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
} from '../../types';

interface Statistics {
  hasToken: boolean;
  isValid: boolean;
  templatesCreated: number;
  templatesScheduled: number;
  expensesCreated: number;
}

/**
 * Handler for fetching extension statistics
 */
export class GetStatisticsHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.GET_STATISTICS>
> {
  readonly action = MessageAction.GET_STATISTICS;

  protected async execute(
    _message: ExtractMessageByAction<MessageAction.GET_STATISTICS>,
    _sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse<Statistics>> {
    deps.logger.info('GetStatisticsHandler: Fetching statistics');

    try {
      // Get auth status
      const hasToken = await deps.tokenManager.hasToken();
      let isValid = false;
      if (hasToken) {
        const token = await deps.tokenManager.get();
        isValid = token ? await deps.tokenManager.isValid(token) : false;
      }

      // Get template statistics
      const templates = await deps.templateManager.listTemplates();
      const templatesCreated = templates.items.length;
      const templatesScheduled = templates.items.filter((t) => t.scheduling?.enabled).length;

      // Get expense statistics (simplified for now)
      const expensesCreated = 0; // Would need to implement counting in expense manager

      const stats: Statistics = {
        hasToken,
        isValid,
        templatesCreated,
        templatesScheduled,
        expensesCreated,
      };

      deps.logger.info('GetStatisticsHandler: Statistics calculated', stats);

      return createSuccessResponse(stats);
    } catch (error) {
      deps.logger.error('GetStatisticsHandler: Failed to fetch statistics', { error });
      throw error;
    }
  }
}
