import {
  MessageAction,
  AttachReceiptMessage,
  AttachReceiptPayload,
  AttachReceiptResponse,
  isValidMessage,
  BackgroundMessage,
} from '../types';

describe('Receipt Message Types', () => {
  describe('AttachReceiptMessage', () => {
    it('should create valid AttachReceiptMessage with ArrayBuffer', () => {
      const buffer = new ArrayBuffer(100);
      const message: AttachReceiptMessage = {
        action: MessageAction.ATTACH_RECEIPT,
        payload: {
          expenseId: 'exp-123',
          filename: 'receipt.pdf',
          mimeType: 'application/pdf',
          size: 100,
          data: buffer,
          isBase64: false,
        },
      };

      expect(message.action).toBe(MessageAction.ATTACH_RECEIPT);
      expect(message.payload.data).toBeInstanceOf(ArrayBuffer);
      expect(message.payload.isBase64).toBe(false);
    });

    it('should create valid AttachReceiptMessage with base64 string', () => {
      const base64Data = 'SGVsbG8gV29ybGQ=';
      const message: AttachReceiptMessage = {
        action: MessageAction.ATTACH_RECEIPT,
        payload: {
          expenseId: 'exp-456',
          filename: 'receipt.jpg',
          mimeType: 'image/jpeg',
          size: 5000,
          data: base64Data,
          isBase64: true,
        },
      };

      expect(message.action).toBe(MessageAction.ATTACH_RECEIPT);
      expect(typeof message.payload.data).toBe('string');
      expect(message.payload.isBase64).toBe(true);
    });

    it('should be assignable to BackgroundMessage', () => {
      const message: BackgroundMessage = {
        action: MessageAction.ATTACH_RECEIPT,
        payload: {
          expenseId: 'exp-789',
          filename: 'receipt.png',
          mimeType: 'image/png',
          size: 3000,
          data: 'base64string',
          isBase64: true,
        },
      };

      expect(message.action).toBe(MessageAction.ATTACH_RECEIPT);
    });

    it('should validate as valid message', () => {
      const message: AttachReceiptMessage = {
        action: MessageAction.ATTACH_RECEIPT,
        payload: {
          expenseId: 'exp-999',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          data: new ArrayBuffer(1000),
        },
      };

      expect(isValidMessage(message)).toBe(true);
    });
  });

  describe('AttachReceiptPayload', () => {
    it('should support all required fields', () => {
      const payload: AttachReceiptPayload = {
        expenseId: 'exp-001',
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        size: 204800,
        data: new ArrayBuffer(204800),
      };

      expect(payload.expenseId).toBe('exp-001');
      expect(payload.filename).toBe('invoice.pdf');
      expect(payload.mimeType).toBe('application/pdf');
      expect(payload.size).toBe(204800);
      expect(payload.data).toBeInstanceOf(ArrayBuffer);
      expect(payload.isBase64).toBeUndefined();
    });

    it('should support optional isBase64 flag', () => {
      const payload: AttachReceiptPayload = {
        expenseId: 'exp-002',
        filename: 'receipt.jpg',
        mimeType: 'image/jpeg',
        size: 50000,
        data: 'base64encodedstring',
        isBase64: true,
      };

      expect(payload.isBase64).toBe(true);
      expect(typeof payload.data).toBe('string');
    });
  });

  describe('AttachReceiptResponse', () => {
    it('should support required receiptKey field', () => {
      const response: AttachReceiptResponse = {
        receiptKey: 'receipt-key-123',
      };

      expect(response.receiptKey).toBe('receipt-key-123');
    });

    it('should support only receiptKey field', () => {
      const response: AttachReceiptResponse = {
        receiptKey: 'receipt-key-456',
      };

      expect(response.receiptKey).toBe('receipt-key-456');
    });
  });

  describe('MessageAction enum', () => {
    it('should include ATTACH_RECEIPT action', () => {
      expect(MessageAction.ATTACH_RECEIPT).toBe('attachReceipt');
      expect(Object.values(MessageAction)).toContain('attachReceipt');
    });
  });

  describe('Type safety', () => {
    it('should enforce correct payload structure at compile time', () => {
      // This test verifies TypeScript compilation - if it compiles, types are correct
      const validMessage: AttachReceiptMessage = {
        action: MessageAction.ATTACH_RECEIPT,
        payload: {
          expenseId: 'test',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 100,
          data: new ArrayBuffer(100),
        },
      };

      expect(validMessage).toBeDefined();
    });
  });
});
