import { MessageAction, IHandler, BackgroundMessage } from '../types';
import { BaseHandler } from './base-handler';

// Import all new handler classes
import { GetTokenHandler } from './token/get-token.handler';
import { ClearTokensHandler } from './token/clear-tokens.handler';
import { GetTokenStatusHandler } from './token/get-token-status.handler';
import { SaveTokenHandler } from './token/save-token.handler';
import { ExportTokensHandler } from './token/export-tokens.handler';
import { ImportTokensHandler } from './token/import-tokens.handler';
import { GetStatisticsHandler } from './token/get-statistics.handler';
import { OpenSidePanelHandler } from './ui/open-side-panel.handler';
import { CreateExpenseHandler } from './expense/create-expense.handler';
import { SubmitDraftExpenseHandler } from './expense/submit-draft-expense.handler';
import { FetchExpenseHandler } from './expense/fetch-expense.handler';
import { FetchExpensesHandler } from './expense/fetch-expenses.handler';
import { SearchExpensesHandler } from './expense/search-expenses.handler';
import { GetCategoriesHandler } from './expense/get-categories.handler';
import { GetExpenseStatsHandler } from './expense/get-expense-stats.handler';
import { ReceiptOperationsHandler } from './expense/receipt-operations.handler';
import { TestApiParametersHandler } from './expense/test-api-parameters.handler';
// import { ValidateExpenseHandler } from './expense/validate-expense.handler';
import { ListTemplatesHandler } from './template/list-templates.handler';
import { CreateTemplateHandler } from './template/create-template.handler';
import { UpdateTemplateHandler } from './template/update-template.handler';
import { DeleteTemplateHandler } from './template/delete-template.handler';
import { UpdateTemplateUsageHandler } from './template/update-template-usage.handler';
import { SetTemplateSchedulingHandler } from './template/set-template-scheduling.handler';
import { RemoveTemplateSchedulingHandler } from './template/remove-template-scheduling.handler';
import { PauseTemplateSchedulingHandler } from './template/pause-template-scheduling.handler';
import { ResumeTemplateSchedulingHandler } from './template/resume-template-scheduling.handler';

/**
 * Type-safe handler registry using the new base handler pattern.
 * Manages registration and retrieval of message handlers.
 */
export class TypedHandlerRegistry {
  private handlers = new Map<MessageAction, IHandler>();

  constructor() {
    this.registerHandlers();
  }

  /**
   * Register all handlers - both new BaseHandler implementations
   * and legacy handlers (temporarily during migration)
   */
  private registerHandlers(): void {
    // Register all BaseHandler implementations
    // Token handlers
    this.register(new GetTokenHandler());
    this.register(new ClearTokensHandler());
    this.register(new GetTokenStatusHandler());
    this.register(new SaveTokenHandler());
    this.register(new ExportTokensHandler());
    this.register(new ImportTokensHandler());
    this.register(new GetStatisticsHandler());

    // UI handlers
    this.register(new OpenSidePanelHandler());

    // Expense handlers
    this.register(new CreateExpenseHandler());
    this.register(new SubmitDraftExpenseHandler());
    this.register(new FetchExpenseHandler());
    this.register(new FetchExpensesHandler());
    this.register(new SearchExpensesHandler());
    this.register(new GetCategoriesHandler());
    this.register(new GetExpenseStatsHandler());
    // Receipt handlers (unified)
    this.register(ReceiptOperationsHandler.createAttachReceiptHandler());
    this.register(ReceiptOperationsHandler.createDeleteReceiptHandler());
    this.register(ReceiptOperationsHandler.createGetReceiptUrlHandler());

    // Testing handlers
    this.register(new TestApiParametersHandler());

    // TODO: ValidateExpenseHandler needs a proper MessageAction mapping
    // this.register(new ValidateExpenseHandler());

    // Template handlers
    this.register(new ListTemplatesHandler());
    this.register(new CreateTemplateHandler());
    this.register(new UpdateTemplateHandler());
    this.register(new DeleteTemplateHandler());
    this.register(new UpdateTemplateUsageHandler());

    // Scheduling handlers
    this.register(new SetTemplateSchedulingHandler());
    this.register(new RemoveTemplateSchedulingHandler());
    this.register(new PauseTemplateSchedulingHandler());
    this.register(new ResumeTemplateSchedulingHandler());
  }

  /**
   * Register a new BaseHandler implementation
   */
  register<T extends BackgroundMessage>(handler: BaseHandler<T>): void {
    this.handlers.set(handler.action, handler);
  }

  /**
   * Get handler for a specific action.
   */
  getHandler(action: MessageAction): IHandler | undefined {
    return this.handlers.get(action);
  }

  /**
   * Check if an action has a registered handler
   */
  hasHandler(action: MessageAction): boolean {
    return this.handlers.has(action);
  }

  /**
   * Get all registered actions
   */
  getRegisteredActions(): MessageAction[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for monitoring
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }
}
