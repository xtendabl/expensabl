import { MessageAction } from '../../features/messaging/types';
import { MessageAdapter } from '../message-adapter';

// Mock logger
jest.mock('../../shared/services/logger/chrome-logger-setup', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { warn } from '../../shared/services/logger/chrome-logger-setup';

describe('MessageAdapter', () => {
  describe('transformRequest', () => {
    it('should transform checkAuth to GET_TOKEN_STATUS', () => {
      const uiMessage = { action: 'checkAuth' };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toEqual({
        action: MessageAction.GET_TOKEN_STATUS,
      });
    });

    it('should transform fetchExpense with selectedTxn', () => {
      const uiMessage = {
        action: 'fetchExpense',
        selectedTxn: { id: 'expense-123' },
      };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toEqual({
        action: MessageAction.FETCH_EXPENSE,
        payload: { expenseId: 'expense-123' },
      });
    });

    it('should transform createTemplate', () => {
      const uiMessage = {
        action: 'createTemplate',
        template: {
          name: 'Test Template',
          expenseData: {
            amount: 100,
            categoryId: 'travel',
          },
        },
      };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toEqual({
        action: MessageAction.CREATE_TEMPLATE,
        payload: {
          name: 'Test Template',
          expenseData: {
            amount: 100,
            categoryId: 'travel',
          },
          createdFrom: 'manual',
        },
      });
    });

    it('should transform updateSchedule with enabled schedule', () => {
      const uiMessage = {
        action: 'updateSchedule',
        templateId: 'template-123',
        schedule: {
          enabled: true,
          recurrence: 'weekly',
          time: '09:00',
          weeklyDays: [1, 3, 5],
        },
      };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toEqual({
        action: MessageAction.SET_TEMPLATE_SCHEDULING,
        payload: {
          templateId: 'template-123',
          scheduling: {
            enabled: true,
            paused: false,
            interval: 'weekly',
            executionTime: {
              hour: 9,
              minute: 0,
            },
            intervalConfig: {
              daysOfWeek: ['monday', 'wednesday', 'friday'],
              dayOfMonth: undefined,
            },
          },
        },
      });
    });

    it('should transform updateSchedule with disabled schedule', () => {
      const uiMessage = {
        action: 'updateSchedule',
        templateId: 'template-123',
        schedule: {
          enabled: false,
        },
      };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toEqual({
        action: MessageAction.REMOVE_TEMPLATE_SCHEDULING,
        payload: { templateId: 'template-123' },
      });
    });

    it('should handle unknown actions', () => {
      const uiMessage = { action: 'unknownAction' };
      const result = MessageAdapter.transformRequest(uiMessage);

      expect(result).toBeNull();
      expect(warn).toHaveBeenCalledWith('Unknown UI action:', 'unknownAction');
    });
  });

  describe('transformResponse', () => {
    it('should transform error responses', () => {
      const response = {
        success: false,
        error: 'Something went wrong',
      };
      const result = MessageAdapter.transformResponse('anyAction', response);

      expect(result).toEqual({
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should transform checkAuth response', () => {
      const response = {
        success: true,
        data: {
          hasToken: true,
          isValid: false,
        },
      };
      const result = MessageAdapter.transformResponse('checkAuth', response);

      expect(result).toEqual({
        success: true,
        hasToken: true,
        isValid: false,
      });
    });

    it('should transform fetchExpense response', () => {
      const response = {
        success: true,
        data: {
          id: 'expense-123',
          amount: 100,
        },
      };
      const result = MessageAdapter.transformResponse('fetchExpense', response);

      expect(result).toEqual({
        success: true,
        expense: {
          id: 'expense-123',
          amount: 100,
        },
      });
    });

    it('should transform getExpenses response', () => {
      const response = {
        success: true,
        data: {
          items: [
            { id: '1', amount: 100 },
            { id: '2', amount: 200 },
          ],
        },
      };
      const result = MessageAdapter.transformResponse('getExpenses', response);

      expect(result).toEqual({
        success: true,
        expenses: [
          { id: '1', amount: 100 },
          { id: '2', amount: 200 },
        ],
      });
    });

    it('should transform getTemplates response', () => {
      const response = {
        success: true,
        data: {
          items: [
            { id: 't1', name: 'Template 1' },
            { id: 't2', name: 'Template 2' },
          ],
        },
      };
      const result = MessageAdapter.transformResponse('getTemplates', response);

      expect(result).toEqual({
        success: true,
        templates: [
          { id: 't1', name: 'Template 1' },
          { id: 't2', name: 'Template 2' },
        ],
      });
    });

    it('should pass through unknown action responses', () => {
      const response = {
        success: true,
        data: { some: 'data' },
      };
      const result = MessageAdapter.transformResponse('unknownAction', response);

      expect(result).toEqual(response);
    });

    it('should handle missing data gracefully', () => {
      const response = { success: true };

      const checkAuthResult = MessageAdapter.transformResponse('checkAuth', response);
      expect(checkAuthResult).toEqual({
        success: true,
        hasToken: false,
        isValid: false,
      });

      const getTemplatesResult = MessageAdapter.transformResponse('getTemplates', response);
      expect(getTemplatesResult).toEqual({
        success: true,
        templates: [],
      });
    });
  });
});
