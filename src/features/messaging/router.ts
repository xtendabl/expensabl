import { TypedHandlerRegistry } from './handlers/typed-registry';
import {
  BackgroundMessage,
  MessageResponse,
  HandlerDependencies,
  isValidMessage,
  createErrorResponse,
} from './types';

/**
 * Central message router that dispatches typed messages to registered handlers.
 * Provides validation, logging, and error handling for all message processing.
 *
 * @class Router
 *
 * @remarks
 * The router is the core of the messaging system, ensuring:
 * - Type-safe message dispatch based on action discriminator
 * - Comprehensive validation at message and payload levels
 * - Structured error responses for invalid messages
 * - Performance logging for monitoring
 *
 * @example
 * ```typescript
 * const router = new Router(dependencies);
 * const response = await router.handleMessage(
 *   { action: MessageAction.CREATE_EXPENSE, payload: expenseData },
 *   sender
 * );
 * ```
 */
export class Router {
  private registry: TypedHandlerRegistry;
  private dependencies: HandlerDependencies;

  constructor(dependencies: HandlerDependencies) {
    this.registry = new TypedHandlerRegistry();
    this.dependencies = dependencies;
  }

  async handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    try {
      // Basic validation
      if (!isValidMessage(message)) {
        return createErrorResponse('Invalid message format');
      }

      const typedMessage = message as BackgroundMessage;

      // Get handler
      const handler = this.registry.getHandler(typedMessage.action);
      if (!handler) {
        return createErrorResponse(`Unknown action: ${typedMessage.action}`);
      }

      // Log incoming message
      this.dependencies.logger.info('[ROUTER] Processing message', {
        action: typedMessage.action,
        requestId: (typedMessage as any).requestId,
        timestamp: Date.now(),
        sender: sender.id || 'unknown',
        hasPayload: 'payload' in typedMessage,
      });

      // Execute handler
      const response = await handler.handle(typedMessage, sender, this.dependencies);

      // Log response
      this.dependencies.logger.debug('Message processed', {
        action: typedMessage.action,
        success: response.success,
        hasData: !!response.data,
      });

      return response;
    } catch (error) {
      this.dependencies.logger.error('Message handling error', { error, message });
      return createErrorResponse(error instanceof Error ? error.message : 'Internal error');
    }
  }

  /**
   * Get handler count for monitoring
   */
  getHandlerCount() {
    return this.registry.getHandlerCount();
  }
}
