import {
  BackgroundMessage,
  MessageResponse,
  MessageAction,
  HandlerDependencies,
  createErrorResponse,
} from '../types';

/**
 * Abstract base class for all message handlers.
 * Provides common functionality like validation, logging, and error handling.
 *
 * @template T - The specific message type this handler processes
 */
export abstract class BaseHandler<T extends BackgroundMessage> {
  /**
   * The action this handler is responsible for.
   * Must match the action in the message type T.
   */
  abstract readonly action: MessageAction;

  /**
   * Executes the handler's business logic.
   * Subclasses implement this to handle their specific message type.
   *
   * @param message - The typed message payload
   * @param sender - Chrome runtime message sender info
   * @param deps - Injected service dependencies
   * @returns Promise resolving to the response
   */
  protected abstract execute(
    message: T,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse>;

  /**
   * Main entry point for handling messages.
   * Provides validation, logging, and error handling wrapper.
   *
   * @param message - The incoming message (type-checked)
   * @param sender - Chrome runtime message sender info
   * @param deps - Injected service dependencies
   * @returns Promise resolving to the response
   */
  async handle(
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse> {
    // Type guard - ensure message matches this handler's action
    if (message.action !== this.action) {
      return createErrorResponse('Invalid action for handler');
    }

    const startTime = Date.now();

    try {
      // Log incoming request
      deps.logger.debug(`Processing ${this.action}`, {
        action: this.action,
        sender: sender.id || 'unknown',
        hasPayload: 'payload' in message,
      });

      // Validate message if validation is implemented
      const validation = this.validate(message as T);
      if (!validation.isValid) {
        return createErrorResponse(validation.error || 'Validation failed');
      }

      // Execute handler logic with proper typing
      const response = await this.execute(message as T, sender, deps);

      // Log successful completion
      const duration = Date.now() - startTime;
      deps.logger.debug(`${this.action} completed`, {
        action: this.action,
        success: response.success,
        duration,
        hasData: !!response.data,
      });

      return response;
    } catch (error) {
      // Log error details
      const duration = Date.now() - startTime;
      deps.logger.error(`${this.action} failed`, {
        action: this.action,
        error,
        duration,
        sender: sender.id || 'unknown',
      });

      // Return standardized error response
      return createErrorResponse(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * Optional validation method that subclasses can override.
   * Called before execute() to validate message payload.
   *
   * @param message - The typed message to validate
   * @returns Validation result with optional error details
   */
  protected validate(_message: T): { isValid: boolean; error?: string } {
    return { isValid: true };
  }
}
