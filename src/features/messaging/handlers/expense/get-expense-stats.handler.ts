import { BaseHandler } from '../base-handler';
import {
  BackgroundMessage,
  MessageAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
  createErrorResponse,
} from '../../types';
import { ExpenseFilters } from '../../../expenses/types';

interface StatsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'category';
}

interface GetExpenseStatsMessage {
  action: MessageAction.GET_STATISTICS;
  payload?: StatsParams;
}

/**
 * Handler for fetching expense statistics
 */
export class GetExpenseStatsHandler extends BaseHandler<GetExpenseStatsMessage> {
  readonly action = MessageAction.GET_STATISTICS;

  protected validate(message: GetExpenseStatsMessage): { isValid: boolean; error?: string } {
    const payload = message.payload;

    if (!payload) {
      return { isValid: true }; // Payload is optional
    }

    if (payload.startDate && !this.isValidDate(payload.startDate)) {
      return { isValid: false, error: 'Invalid start date format' };
    }

    if (payload.endDate && !this.isValidDate(payload.endDate)) {
      return { isValid: false, error: 'Invalid end date format' };
    }

    if (payload.startDate && payload.endDate) {
      const start = new Date(payload.startDate);
      const end = new Date(payload.endDate);
      if (start > end) {
        return { isValid: false, error: 'Start date must be before end date' };
      }
    }

    if (payload.groupBy && !['day', 'week', 'month', 'category'].includes(payload.groupBy)) {
      return { isValid: false, error: 'Invalid groupBy value' };
    }

    return { isValid: true };
  }

  protected async execute(
    message: GetExpenseStatsMessage,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse> {
    const payload = message.payload;

    deps.logger.info('GetExpenseStatsHandler: Fetching expense statistics', payload);

    try {
      // Convert StatsParams to ExpenseFilters
      const filters: ExpenseFilters = {};

      if (payload?.startDate) {
        filters.dateFrom = payload.startDate;
      }

      if (payload?.endDate) {
        filters.dateTo = payload.endDate;
      }

      const stats = await deps.expenseManager.getStats(filters);

      deps.logger.info('GetExpenseStatsHandler: Statistics calculated', {
        totalAmount: stats.totalAmount,
        totalCount: stats.totalCount,
        categoryCount: Object.keys(stats.byCategory).length,
      });

      return createSuccessResponse(stats);
    } catch (error) {
      deps.logger.error('GetExpenseStatsHandler: Failed to fetch statistics', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch statistics'
      );
    }
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
