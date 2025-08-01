import { ExpenseManager } from './manager';
import { ExtendedExpenseManager } from './manager-extended';
import { ApiConfig, DEFAULT_API_CONFIG } from './config/api-config';
import { ApiHttpClient, TokenProvider } from './http/http-client';
import { ExpenseService } from './services/expense-operations';
import { tokenManager } from '../auth/manager';

/**
 * Token provider that uses the auth manager
 */
class AuthManagerTokenProvider implements TokenProvider {
  async getToken(): Promise<string | null> {
    return tokenManager.get();
  }
}

/**
 * Creates an expense manager with auth token support
 */
export function createExpenseManagerWithAuth(timezone?: string): ExtendedExpenseManager {
  const config: ApiConfig = {
    ...DEFAULT_API_CONFIG,
    ...(timezone && { defaultTimezone: timezone }),
  };

  const tokenProvider = new AuthManagerTokenProvider();
  const httpClient = new ApiHttpClient(config, tokenProvider);

  // Create a custom ExpenseManager that uses our configured HTTP client
  class AuthAwareExpenseManager extends ExtendedExpenseManager {
    constructor() {
      // Call parent constructor with timezone
      super(timezone);

      // Replace the expense service with one using our auth-aware HTTP client
      const expenseService = new ExpenseService(httpClient);
      (this as any).expenseService = expenseService;
    }
  }

  return new AuthAwareExpenseManager();
}

// Export a singleton instance for the service container
export const authAwareExpenseManager = createExpenseManagerWithAuth();
