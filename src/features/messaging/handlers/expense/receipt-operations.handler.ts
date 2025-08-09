import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
  createErrorResponse,
  ExtractMessageByAction,
  AttachReceiptMessage,
  DeleteReceiptMessage,
  GetReceiptUrlMessage,
  ReceiptAttachResponse,
  ReceiptUrlResponse,
} from '../../types';

/**
 * Unified handler for all receipt operations
 */
export class ReceiptOperationsHandler {
  /**
   * Handle attaching a receipt to an expense
   */
  static createAttachReceiptHandler() {
    return new (class extends BaseHandler<AttachReceiptMessage> {
      readonly action = MessageAction.ATTACH_RECEIPT;

      async execute(
        message: AttachReceiptMessage,
        sender: chrome.runtime.MessageSender,
        deps: HandlerDependencies
      ): Promise<MessageResponse<ReceiptAttachResponse>> {
        try {
          const { expenseId, filename, mimeType, size, data, isBase64 } = message.payload;

          // Convert base64 to ArrayBuffer if needed
          let fileData: ArrayBuffer;
          if (isBase64 && typeof data === 'string') {
            fileData = this.base64ToArrayBuffer(data);
          } else if (data instanceof ArrayBuffer) {
            fileData = data;
          } else {
            throw new Error('Invalid data format: expected ArrayBuffer or base64 string');
          }

          // Create File object
          const file = new File([fileData], filename, { type: mimeType });

          // Validate file type
          const supportedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
          ];
          const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
          const supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'];

          if (
            !supportedTypes.includes(mimeType.toLowerCase()) &&
            !supportedExtensions.includes(fileExtension)
          ) {
            throw new Error(
              `Unsupported file type. Please upload PDF, JPG, PNG, GIF, or WEBP files.`
            );
          }

          // Detect file type for Navan API - use extension or mime type suffix
          let fileType = fileExtension;
          if (!fileType || fileType === '') {
            // Extract from mime type if no extension
            fileType = mimeType.split('/').pop()?.toLowerCase() || 'unknown';
          }
          // Normalize jpeg to jpg
          if (fileType === 'jpeg') fileType = 'jpg';

          deps.logger.info('Uploading receipt', {
            expenseId,
            filename,
            fileType,
            size: `${(size / 1024 / 1024).toFixed(2)}MB`,
          });

          // Create FormData for multipart upload
          const formData = new FormData();
          formData.append('receipt', file, filename);
          formData.append('type', fileType);

          // Upload receipt using receipt service
          const result = await deps.receiptService.uploadReceipt(expenseId, formData);

          return createSuccessResponse<ReceiptAttachResponse>({
            receiptKey: result.receiptKey,
          });
        } catch (error) {
          deps.logger.error('Failed to attach receipt', { error, message });
          return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to attach receipt'
          ) as MessageResponse<ReceiptAttachResponse>;
        }
      }

      private base64ToArrayBuffer(base64: string): ArrayBuffer {
        if (!base64) {
          throw new Error('Base64 string is required');
        }

        if (base64.length === 0) {
          return new ArrayBuffer(0);
        }

        try {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);

          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          return bytes.buffer;
        } catch (error) {
          throw new Error(
            `Failed to decode base64 to ArrayBuffer: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    })();
  }

  /**
   * Handle deleting a receipt from an expense
   */
  static createDeleteReceiptHandler() {
    return new (class extends BaseHandler<DeleteReceiptMessage> {
      readonly action = MessageAction.DELETE_RECEIPT;

      async execute(
        message: DeleteReceiptMessage,
        sender: chrome.runtime.MessageSender,
        deps: HandlerDependencies
      ): Promise<MessageResponse> {
        try {
          const { expenseId, receiptKey } = message.payload;

          deps.logger.info('Deleting receipt', {
            expenseId,
            receiptKey,
          });

          // Delete receipt using receipt service
          await deps.receiptService.deleteReceipt(expenseId, receiptKey);

          deps.logger.info('Receipt deleted successfully', {
            expenseId,
            receiptKey,
          });

          return createSuccessResponse({
            message: 'Receipt deleted successfully',
          });
        } catch (error) {
          deps.logger.error('Failed to delete receipt', { error, message });
          return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to delete receipt'
          );
        }
      }
    })();
  }

  /**
   * Handle getting a receipt URL
   */
  static createGetReceiptUrlHandler() {
    return new (class extends BaseHandler<GetReceiptUrlMessage> {
      readonly action = MessageAction.GET_RECEIPT_URL;

      protected validate(message: GetReceiptUrlMessage) {
        if (!message.payload?.receiptKey) {
          return { isValid: false, error: 'Receipt key is required' };
        }
        return { isValid: true };
      }

      protected async execute(
        message: GetReceiptUrlMessage,
        sender: chrome.runtime.MessageSender,
        deps: HandlerDependencies
      ) {
        deps.logger.info('GetReceiptUrlHandler: Executing', { payload: message.payload });

        try {
          const { receiptKey } = message.payload;

          // Fetch the presigned URL from the API
          const receiptUrl = await deps.receiptService.getReceiptUrl(receiptKey);

          deps.logger.info('Receipt URL fetched', { receiptKey, receiptUrl });
          const response = createSuccessResponse<ReceiptUrlResponse>({ url: receiptUrl });
          return response;
        } catch (error) {
          console.error('[RECEIPT_HANDLER] Error getting receipt URL:', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
          });
          deps.logger.error('Failed to get receipt URL', error);

          // Return a fallback URL even on error
          const fallbackUrl = `https://app.navan.com/api/liquid/user/receipts/${message.payload.receiptKey}`;
          return createSuccessResponse<ReceiptUrlResponse>({ url: fallbackUrl });
        }
      }
    })();
  }
}
