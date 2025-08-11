import { BaseHandler } from '../base-handler';
import {
  BackgroundMessage,
  MessageAction,
  MessageResponse,
  HandlerDependencies,
  createSuccessResponse,
  createErrorResponse,
} from '../../types';
import { ApiParameterTester } from '../../../expenses/services/api-parameter-tester';
import { ApiHttpClient } from '../../../expenses/http/http-client';
import { DEFAULT_API_CONFIG } from '../../../expenses/config/api-config';

interface TestApiParametersMessage {
  action: MessageAction.TEST_API_PARAMETERS;
}

/**
 * Handler for testing API parameters to discover which query parameters
 * are supported by the Navan /search/transactions endpoint
 */
export class TestApiParametersHandler extends BaseHandler<TestApiParametersMessage> {
  readonly action = MessageAction.TEST_API_PARAMETERS;

  protected validate(message: TestApiParametersMessage): { isValid: boolean; error?: string } {
    // No validation needed - this is a simple test command
    return { isValid: true };
  }

  protected async execute(
    message: TestApiParametersMessage,
    sender: chrome.runtime.MessageSender,
    deps: HandlerDependencies
  ): Promise<MessageResponse> {
    deps.logger.info('TestApiParametersHandler: Starting API parameter discovery tests');

    try {
      // Get the current auth token
      const token = await deps.tokenManager.get();
      if (!token) {
        return createErrorResponse('No authentication token available. Please log in first.');
      }

      // Create an HTTP client instance for testing
      const httpClient = new ApiHttpClient(
        {
          ...DEFAULT_API_CONFIG,
          defaultTimezone: 'America/Los_Angeles',
        },
        {
          getToken: () => Promise.resolve(token),
        }
      );

      const tester = new ApiParameterTester(httpClient);
      const results = await tester.runTests();
      const report = tester.generateReport();

      deps.logger.info('TestApiParametersHandler: Test results', { report });

      return createSuccessResponse({
        results: tester.getResultsJson(),
        report: report,
      });
    } catch (error) {
      deps.logger.error('TestApiParametersHandler: Failed to run parameter tests', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Failed to run parameter tests'
      );
    }
  }
}
