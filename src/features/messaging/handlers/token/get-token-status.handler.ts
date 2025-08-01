import { BaseHandler } from '../base-handler';
import {
  MessageAction,
  ExtractMessageByAction,
  createSuccessResponse,
  HandlerDependencies,
} from '../../types';
import { AuthStatus } from '../../../auth/types';

/**
 * Handler for GET_TOKEN_STATUS messages.
 * Returns comprehensive token status information including AuthStatus.
 */
export class GetTokenStatusHandler extends BaseHandler<
  ExtractMessageByAction<MessageAction.GET_TOKEN_STATUS>
> {
  readonly action = MessageAction.GET_TOKEN_STATUS;

  protected async execute(
    message: ExtractMessageByAction<MessageAction.GET_TOKEN_STATUS>,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ) {
    // Use storage-based methods for authoritative status
    const authStatus = await deps.tokenManager.getAuthStatus();
    const hasToken = await deps.tokenManager.hasToken();

    // Derive isAuthenticated from authoritative authStatus to ensure consistency
    const isAuthenticated = authStatus === AuthStatus.AUTHENTICATED;

    return createSuccessResponse({
      authStatus,
      hasToken,
      isAuthenticated,
      // Legacy fields for backward compatibility
      isValid: isAuthenticated,
      token: isAuthenticated ? await deps.tokenManager.get() : null,
    });
  }
}
