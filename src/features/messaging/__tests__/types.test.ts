import { MessageAction, isValidMessage, BackgroundMessage } from '../types';

describe('MessageAction Enum', () => {
  describe('New UI Operations', () => {
    it('should include all new UI message actions', () => {
      expect(MessageAction.OPEN_SIDE_PANEL).toBe('openSidePanel');
      expect(MessageAction.EXPORT_TOKENS).toBe('exportTokens');
      expect(MessageAction.IMPORT_TOKENS).toBe('importTokens');
      expect(MessageAction.GET_STATISTICS).toBe('getStatistics');
      expect(MessageAction.UPDATE_TEMPLATE_USAGE).toBe('updateTemplateUsage');
    });

    it('should have correct total number of actions', () => {
      const actionCount = Object.keys(MessageAction).length;
      expect(actionCount).toBe(21); // 16 original + 5 new (added SAVE_TOKEN)
    });
  });
});

describe('BackgroundMessage Types', () => {
  describe('New UI Operation Messages', () => {
    it('should validate OPEN_SIDE_PANEL message', () => {
      const message: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      expect(isValidMessage(message)).toBe(true);
    });

    it('should validate EXPORT_TOKENS message', () => {
      const message: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      expect(isValidMessage(message)).toBe(true);
    });

    it('should validate IMPORT_TOKENS message with payload', () => {
      const message: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens: { auth: 'token123' } },
      };
      expect(isValidMessage(message)).toBe(true);
    });

    it('should validate GET_STATISTICS message', () => {
      const message: BackgroundMessage = { action: MessageAction.GET_STATISTICS };
      expect(isValidMessage(message)).toBe(true);
    });

    it('should validate UPDATE_TEMPLATE_USAGE message with payload', () => {
      const message: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'template-123' },
      };
      expect(isValidMessage(message)).toBe(true);
    });
  });

  describe('Type Checking', () => {
    it('should correctly type-check messages with no payload', () => {
      const openSidePanel: BackgroundMessage = { action: MessageAction.OPEN_SIDE_PANEL };
      const exportTokens: BackgroundMessage = { action: MessageAction.EXPORT_TOKENS };
      const getStats: BackgroundMessage = { action: MessageAction.GET_STATISTICS };

      // These should compile without errors
      expect(openSidePanel).toBeDefined();
      expect(exportTokens).toBeDefined();
      expect(getStats).toBeDefined();
    });

    it('should correctly type-check messages with required payload', () => {
      const importTokens: BackgroundMessage = {
        action: MessageAction.IMPORT_TOKENS,
        payload: { tokens: { auth: 'token', refresh: 'refresh' } },
      };
      const updateUsage: BackgroundMessage = {
        action: MessageAction.UPDATE_TEMPLATE_USAGE,
        payload: { templateId: 'test-id' },
      };

      expect(importTokens).toBeDefined();
      expect(updateUsage).toBeDefined();
    });
  });
});
