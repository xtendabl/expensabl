import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
} from '../../types';

interface ImportResult {
  requested: number;
  imported: number;
  skipped: number;
}

/**
 * Handler for importing authentication tokens
 */
export class ImportTokensHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.IMPORT_TOKENS>
> {
  readonly action = MessageAction.IMPORT_TOKENS;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.IMPORT_TOKENS>,
    _sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse<ImportResult>> {
    const tokens = message.payload.tokens;

    deps.logger.info('ImportTokensHandler: Importing tokens', {
      tokenCount: Object.keys(tokens).length,
    });

    try {
      let importedCount = 0;
      let skippedCount = 0;
      const tokenEntries = Object.entries(tokens);

      for (const [key, token] of tokenEntries) {
        // Skip if token is masked (contains ...)
        if (token.includes('...')) {
          deps.logger.warn('ImportTokensHandler: Skipping masked token', { key });
          skippedCount++;
          continue;
        }

        // Save token using token manager
        const saved = await deps.tokenManager.save(token, key);
        if (saved) {
          importedCount++;
        }

        deps.logger.debug('ImportTokensHandler: Imported token', { key });
      }

      const result: ImportResult = {
        requested: tokenEntries.length,
        imported: importedCount,
        skipped: skippedCount,
      };

      deps.logger.info('ImportTokensHandler: Import completed', result);

      return createSuccessResponse(result);
    } catch (error) {
      deps.logger.error('ImportTokensHandler: Failed to import tokens', { error });
      throw error;
    }
  }

  protected validate(message: ExtractMessageByAction<MessageAction.IMPORT_TOKENS>): {
    isValid: boolean;
    error?: string;
  } {
    if (!message.payload || typeof message.payload !== 'object') {
      return { isValid: false, error: 'Invalid payload' };
    }

    if (!message.payload.tokens || typeof message.payload.tokens !== 'object') {
      return { isValid: false, error: 'Tokens must be an object' };
    }

    // Validate each token is a string
    const tokens = message.payload.tokens;
    for (const [key, value] of Object.entries(tokens)) {
      if (typeof value !== 'string') {
        return { isValid: false, error: `Invalid token value for key ${key}` };
      }
    }

    return { isValid: true };
  }
}
