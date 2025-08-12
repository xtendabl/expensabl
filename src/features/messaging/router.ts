import { TypedHandlerRegistry } from './handlers/typed-registry';
import {
  BackgroundMessage,
  MessageResponse,
  HandlerDependencies,
  isValidMessage,
  createErrorResponse,
} from './types';
import { sanitizePayloadQuick } from '../../shared/utils/payload-sanitizer';

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
  private messageQueue: Array<{ timestamp: number; action: string }> = [];
  private processingStats = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageLatency: 0,
    lastProcessedTime: 0,
  };

  constructor(dependencies: HandlerDependencies) {
    this.registry = new TypedHandlerRegistry();
    this.dependencies = dependencies;
  }

  async handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    const routingStart = performance.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();

    // Update processing stats
    this.processingStats.totalMessages++;
    this.messageQueue.push({ timestamp: now, action: 'unknown' });

    // Clean old queue entries (keep last 100)
    if (this.messageQueue.length > 100) {
      this.messageQueue = this.messageQueue.slice(-100);
    }

    // Calculate queue depth and processing delays
    const queueDepth = this.messageQueue.length;
    const recentMessages = this.messageQueue.filter((m) => now - m.timestamp < 5000); // Last 5 seconds
    const processingDelay =
      this.processingStats.lastProcessedTime > 0 ? now - this.processingStats.lastProcessedTime : 0;

    try {
      // Basic validation with timing
      const validationStart = performance.now();
      if (!isValidMessage(message)) {
        const validationTime = Math.round(performance.now() - validationStart);
        const totalTime = Math.round(performance.now() - routingStart);

        this.dependencies.logger.error('MESSAGE_ROUTING: Invalid message format', {
          messageId,
          validation: {
            isValid: false,
            reason: 'Message format validation failed',
            validationTime,
          },
          timing: { total: totalTime, validation: validationTime },
          queueMetrics: { depth: queueDepth, recentCount: recentMessages.length },
          sender: this.analyzeSender(sender),
        });

        return createErrorResponse('Invalid message format');
      }

      const typedMessage = message as BackgroundMessage;
      const validationTime = Math.round(performance.now() - validationStart);

      // Update queue with actual action
      if (this.messageQueue.length > 0) {
        this.messageQueue[this.messageQueue.length - 1].action = typedMessage.action;
      }

      // Get handler with timing
      const handlerLookupStart = performance.now();
      const handler = this.registry.getHandler(typedMessage.action);
      const handlerLookupTime = Math.round(performance.now() - handlerLookupStart);

      if (!handler) {
        const totalTime = Math.round(performance.now() - routingStart);

        this.dependencies.logger.error('MESSAGE_ROUTING: Unknown action', {
          messageId,
          action: typedMessage.action,
          validation: { isValid: true, validationTime },
          handlerLookup: { found: false, lookupTime: handlerLookupTime },
          timing: {
            total: totalTime,
            validation: validationTime,
            handlerLookup: handlerLookupTime,
          },
          queueMetrics: { depth: queueDepth, recentCount: recentMessages.length },
          sender: this.analyzeSender(sender),
          availableActions: this.registry.getRegisteredActions(),
        });

        return createErrorResponse(`Unknown action: ${typedMessage.action}`);
      }

      // Log comprehensive message routing initiation
      this.dependencies.logger.info('MESSAGE_ROUTING: Message processing initiated', {
        messageId,
        action: typedMessage.action,
        requestId: (typedMessage as any).requestId,
        routing: {
          validation: { isValid: true, validationTime },
          handlerLookup: {
            found: true,
            lookupTime: handlerLookupTime,
            handlerType: handler.constructor.name,
          },
          queueMetrics: {
            depth: queueDepth,
            recentCount: recentMessages.length,
            processingDelay,
            averageLatency: this.processingStats.averageLatency,
          },
        },
        message: {
          hasPayload: 'payload' in typedMessage,
          payloadStructure:
            'payload' in typedMessage
              ? this.analyzePayloadStructure((typedMessage as any).payload)
              : null,
        },
        sender: this.analyzeSender(sender),
        timestamp: now,
      });

      // Execute handler with comprehensive timing
      const handlerStart = performance.now();
      const response = await handler.handle(typedMessage, sender, this.dependencies);
      const handlerTime = Math.round(performance.now() - handlerStart);
      const totalTime = Math.round(performance.now() - routingStart);

      // Update processing stats
      this.processingStats.successfulMessages++;
      this.processingStats.lastProcessedTime = Date.now();
      this.processingStats.averageLatency =
        (this.processingStats.averageLatency * (this.processingStats.totalMessages - 1) +
          totalTime) /
        this.processingStats.totalMessages;

      // Log successful message completion
      this.dependencies.logger.info('MESSAGE_ROUTING: Message processing completed', {
        messageId,
        action: typedMessage.action,
        requestId: (typedMessage as any).requestId,
        success: response.success,
        timing: {
          total: totalTime,
          validation: validationTime,
          handlerLookup: handlerLookupTime,
          handlerExecution: handlerTime,
          breakdown: {
            validation_pct: Math.round((validationTime / totalTime) * 100),
            lookup_pct: Math.round((handlerLookupTime / totalTime) * 100),
            execution_pct: Math.round((handlerTime / totalTime) * 100),
          },
        },
        response: {
          success: response.success,
          hasData: !!response.data,
          dataStructure: response.data ? this.analyzePayloadStructure(response.data) : null,
        },
        performance: {
          isSlowMessage: totalTime > 1000,
          isVerySlowMessage: totalTime > 5000,
          handlerPerformance: handlerTime > 500 ? 'slow' : handlerTime > 100 ? 'moderate' : 'fast',
        },
        stats: this.processingStats,
      });

      return response;
    } catch (error) {
      const errorTime = Math.round(performance.now() - routingStart);
      this.processingStats.failedMessages++;
      this.processingStats.lastProcessedTime = Date.now();

      this.dependencies.logger.error('MESSAGE_ROUTING: Message processing failed', {
        messageId,
        action: (message as any)?.action || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        timing: { total: errorTime },
        queueMetrics: { depth: queueDepth, recentCount: recentMessages.length },
        sender: this.analyzeSender(sender),
        message: sanitizePayloadQuick(message, { maxStringLength: 500 }),
        stats: this.processingStats,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      return createErrorResponse(error instanceof Error ? error.message : 'Internal error');
    }
  }

  /**
   * Get handler count for monitoring
   */
  getHandlerCount() {
    return this.registry.getHandlerCount();
  }

  /**
   * Analyze sender context for logging
   */
  private analyzeSender(sender: chrome.runtime.MessageSender): Record<string, unknown> {
    return {
      id: sender.id || 'unknown',
      origin: sender.origin || 'unknown',
      url: sender.url || 'unknown',
      tab: sender.tab
        ? {
            id: sender.tab.id,
            url: sender.tab.url,
            title: sender.tab.title,
          }
        : null,
      frameId: sender.frameId,
      documentId: sender.documentId,
      documentLifecycle: sender.documentLifecycle,
    };
  }

  /**
   * Analyze payload structure for logging
   */
  private analyzePayloadStructure(payload: unknown): Record<string, unknown> {
    if (payload === null || payload === undefined) {
      return { type: payload === null ? 'null' : 'undefined' };
    }

    if (Array.isArray(payload)) {
      return {
        type: 'array',
        length: payload.length,
        firstItemType: payload.length > 0 ? typeof payload[0] : 'empty',
      };
    }

    if (typeof payload === 'object') {
      const keys = Object.keys(payload);
      return {
        type: 'object',
        keyCount: keys.length,
        keys: keys.slice(0, 10), // First 10 keys
        hasNestedObjects: keys.some((key) => typeof (payload as any)[key] === 'object'),
      };
    }

    return {
      type: typeof payload,
      value:
        typeof payload === 'string' && payload.length > 100
          ? `${payload.substring(0, 100)}...`
          : payload,
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      queueDepth: this.messageQueue.length,
      recentMessages: this.messageQueue.filter((m) => Date.now() - m.timestamp < 5000).length,
    };
  }
}
