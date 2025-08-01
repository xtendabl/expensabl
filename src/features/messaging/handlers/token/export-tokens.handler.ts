import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
} from '../../types';

interface TokenExportData {
  tokens: Array<{
    token: string;
    expiresAt?: number;
    createdAt?: number;
  }>;
  exportedAt: number;
  version: string;
}

/**
 * Handler for exporting authentication tokens
 */
export class ExportTokensHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.EXPORT_TOKENS>
> {
  readonly action = MessageAction.EXPORT_TOKENS;

  protected async execute(
    _message: ExtractMessageByAction<MessageAction.EXPORT_TOKENS>,
    _sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse<TokenExportData>> {
    deps.logger.info('ExportTokensHandler: Exporting tokens');

    try {
      // Get current token from token manager
      const tokens: TokenExportData['tokens'] = [];
      const currentToken = await deps.tokenManager.get();

      if (currentToken) {
        tokens.push({
          token: this.maskToken(currentToken),
          createdAt: Date.now(),
        });
      }

      const exportData: TokenExportData = {
        tokens,
        exportedAt: Date.now(),
        version: '1.0.0',
      };

      deps.logger.info('ExportTokensHandler: Export completed', {
        tokenCount: exportData.tokens.length,
      });

      return createSuccessResponse(exportData);
    } catch (error) {
      deps.logger.error('ExportTokensHandler: Failed to export tokens', { error });
      throw error;
    }
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) {
      return token;
    }
    // Show first 10 and last 4 characters
    return `${token.substring(0, 10)}...${token.substring(token.length - 4)}`;
  }
}
