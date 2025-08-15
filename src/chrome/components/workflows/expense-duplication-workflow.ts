import { SearchTransaction, ExpenseCreatePayload } from '../../../features/expenses/types';
import { searchTransactionToCreatePayload } from '../../../features/expenses/mappers/search-transaction-mapper';
import { showAmountModificationModal } from '../modals/amount-modification-modal';
import { showReceiptSelectionModal } from '../modals/receipt-selection-modal';
import { showSubmitDraftModal } from '../modals/submit-draft-modal';
import { info, error as logError } from '../../../shared/services/logger/chrome-logger-setup';

export enum DuplicationStep {
  AMOUNT_MODIFICATION = 'amount_modification',
  RECEIPT_UPLOAD = 'receipt_upload',
  SUBMIT_DRAFT = 'submit_draft',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled',
}

export interface WorkflowState {
  currentStep: DuplicationStep;
  originalExpense: SearchTransaction;
  modifiedData: Partial<ExpenseCreatePayload>;
  receiptFile?: File;
  submitAsComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface WorkflowCallbacks {
  onComplete: (
    data: ExpenseCreatePayload,
    submitAsComplete: boolean,
    receiptFile?: File
  ) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

class ExpenseDuplicationWorkflow {
  private state: WorkflowState | null = null;
  private callbacks: WorkflowCallbacks | null = null;
  private stepValidators: Map<DuplicationStep, () => boolean>;

  constructor() {
    this.stepValidators = new Map([
      [DuplicationStep.AMOUNT_MODIFICATION, () => true], // Always valid to start
      [
        DuplicationStep.RECEIPT_UPLOAD,
        () => this.state?.modifiedData?.merchantAmount !== undefined,
      ],
      [DuplicationStep.SUBMIT_DRAFT, () => true], // Valid after any previous step
      [DuplicationStep.COMPLETE, () => this.state?.submitAsComplete !== undefined],
    ]);
  }

  /**
   * Start the expense duplication workflow
   */
  async start(expense: SearchTransaction, callbacks: WorkflowCallbacks): Promise<void> {
    if (
      this.state &&
      this.state.currentStep !== DuplicationStep.CANCELLED &&
      this.state.currentStep !== DuplicationStep.COMPLETE
    ) {
      logError('Workflow already in progress');
      return;
    }

    info('Starting expense duplication workflow', { expenseId: expense.id });

    this.callbacks = callbacks;
    this.state = {
      currentStep: DuplicationStep.AMOUNT_MODIFICATION,
      originalExpense: expense,
      modifiedData: {},
      submitAsComplete: false,
      startedAt: new Date(),
    };

    await this.executeCurrentStep();
  }

  /**
   * Execute the current workflow step
   */
  private async executeCurrentStep(): Promise<void> {
    console.log('[Workflow] executeCurrentStep called');
    if (!this.state || !this.callbacks) {
      logError('No active workflow state');
      console.error('[Workflow] No state or callbacks in executeCurrentStep');
      return;
    }

    const { currentStep } = this.state;
    console.log('[Workflow] Current step:', currentStep);

    if (!this.validateStep(currentStep)) {
      logError('Invalid step progression', { currentStep });
      console.error('[Workflow] Step validation failed for:', currentStep);
      this.callbacks.onError?.(new Error('Invalid workflow step'));
      this.cancel();
      return;
    }

    try {
      console.log('[Workflow] Executing step:', currentStep);
      switch (currentStep) {
        case DuplicationStep.AMOUNT_MODIFICATION:
          await this.showAmountModification();
          break;
        case DuplicationStep.RECEIPT_UPLOAD:
          await this.showReceiptUpload();
          break;
        case DuplicationStep.SUBMIT_DRAFT:
          console.log('[Workflow] Calling showSubmitDraft');
          await this.showSubmitDraft();
          break;
        case DuplicationStep.COMPLETE:
          await this.completeWorkflow();
          break;
      }
    } catch (error) {
      logError('Error executing workflow step', { currentStep, error });
      console.error('[Workflow] Error in executeCurrentStep:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      this.cancel();
    }
  }

  /**
   * Show amount modification modal
   */
  private async showAmountModification(): Promise<void> {
    if (!this.state) return;

    const { originalExpense } = this.state;

    showAmountModificationModal({
      originalAmount: originalExpense.merchantAmount,
      currency: originalExpense.merchantCurrency,
      expenseName: originalExpense.merchant.name,
      onConfirm: (newAmount) => {
        if (!this.state) return;

        // Log whether original or modified amount is being used
        if (newAmount === originalExpense.merchantAmount) {
          info('Using original amount', { amount: newAmount });
        } else {
          info('Amount modified', { oldAmount: originalExpense.merchantAmount, newAmount });
        }

        this.state.modifiedData.merchantAmount = newAmount;
        this.state.currentStep = DuplicationStep.RECEIPT_UPLOAD;

        // Add a small delay to ensure modal manager has finished processing the close
        setTimeout(() => {
          console.log('[Workflow] Proceeding to receipt upload step after delay');
          void this.executeCurrentStep();
        }, 150);
      },
      onCancel: () => this.cancel(), // Only called when X button is clicked
    });
  }

  /**
   * Show receipt selection modal
   */
  private async showReceiptUpload(): Promise<void> {
    console.log('[Workflow] showReceiptUpload called');
    if (!this.state) {
      console.error('[Workflow] No state in showReceiptUpload');
      return;
    }

    const { originalExpense } = this.state;
    console.log('[Workflow] About to show receipt selection modal');

    showReceiptSelectionModal({
      expenseName: originalExpense.merchant.name,
      onSelect: (file: File) => {
        console.log('[Workflow] onSelect called with file:', file.name);
        if (!this.state) {
          console.error('[Workflow] No state available in onSelect');
          return;
        }

        info('Receipt selected for upload', { fileName: file.name, size: file.size });
        console.log('[Workflow] Setting receiptFile and moving to SUBMIT_DRAFT step');

        this.state.receiptFile = file;
        this.state.currentStep = DuplicationStep.SUBMIT_DRAFT;
        console.log('[Workflow] Calling executeCurrentStep for SUBMIT_DRAFT');
        void this.executeCurrentStep();
      },
      onSkip: () => {
        if (!this.state) return;

        info('Receipt upload skipped');

        this.state.currentStep = DuplicationStep.SUBMIT_DRAFT;
        void this.executeCurrentStep();
      },
      onCancel: () => this.cancel(),
    });
  }

  /**
   * Show submit/draft selection modal
   */
  private async showSubmitDraft(): Promise<void> {
    console.log('[Workflow] showSubmitDraft called');
    if (!this.state) {
      console.error('[Workflow] No state in showSubmitDraft');
      return;
    }

    const { originalExpense, modifiedData } = this.state;
    console.log('[Workflow] Showing submit/draft modal for:', originalExpense.merchant.name);

    showSubmitDraftModal({
      expenseName: originalExpense.merchant.name,
      expenseAmount: modifiedData.merchantAmount ?? originalExpense.merchantAmount,
      currency: originalExpense.merchantCurrency,
      onSubmit: () => {
        if (!this.state) return;

        info('User chose to submit expense');

        this.state.submitAsComplete = true;
        this.state.currentStep = DuplicationStep.COMPLETE;
        void this.executeCurrentStep();
      },
      onSaveAsDraft: () => {
        if (!this.state) return;

        info('User chose to save as draft');

        this.state.submitAsComplete = false;
        this.state.currentStep = DuplicationStep.COMPLETE;
        void this.executeCurrentStep();
      },
      onCancel: () => this.cancel(),
    });
  }

  /**
   * Complete the workflow and call the completion callback
   */
  private async completeWorkflow(): Promise<void> {
    if (!this.state || !this.callbacks) return;

    const { originalExpense, modifiedData, submitAsComplete, receiptFile } = this.state;

    // Build the final expense data using the mapper
    const baseExpenseData = searchTransactionToCreatePayload(originalExpense);
    const expenseData: ExpenseCreatePayload = {
      ...baseExpenseData,
      date: new Date().toISOString().split('T')[0], // Use date format YYYY-MM-DD, not full ISO timestamp
      merchantAmount: modifiedData.merchantAmount ?? originalExpense.merchantAmount,
      details: {
        ...(baseExpenseData.details || {}),
        description: `Duplicate of ${originalExpense.merchant?.name || 'expense'}`,
      },
      isDraft: !submitAsComplete, // Set isDraft based on user choice
    };

    this.state.completedAt = new Date();
    this.state.currentStep = DuplicationStep.COMPLETE;

    info('Workflow completed', {
      duration: this.state.completedAt.getTime() - this.state.startedAt.getTime(),
      submitAsComplete,
      hasReceipt: !!receiptFile,
    });

    // Debug: Log the exact payload being sent
    console.log('🔍 DEBUG: Expense payload being sent:', JSON.stringify(expenseData, null, 2));

    await this.callbacks.onComplete(expenseData, submitAsComplete, receiptFile);
    this.cleanup();
  }

  /**
   * Cancel the workflow
   */
  cancel(): void {
    console.log('[Workflow] cancel() called');
    console.trace('[Workflow] Cancel call stack');
    if (!this.state) return;

    // Don't cancel if already completed
    if (this.state.currentStep === DuplicationStep.COMPLETE) {
      return;
    }

    info('Workflow cancelled', { currentStep: this.state.currentStep });

    this.state.currentStep = DuplicationStep.CANCELLED;
    this.callbacks?.onCancel?.();
    this.cleanup();
  }

  /**
   * Validate if a step can be executed
   */
  private validateStep(step: DuplicationStep): boolean {
    const validator = this.stepValidators.get(step);
    return validator ? validator() : false;
  }

  /**
   * Clean up workflow state
   */
  private cleanup(): void {
    this.state = null;
    this.callbacks = null;
  }

  /**
   * Check if workflow is active
   */
  isActive(): boolean {
    return (
      this.state !== null &&
      this.state.currentStep !== DuplicationStep.COMPLETE &&
      this.state.currentStep !== DuplicationStep.CANCELLED
    );
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState | null {
    return this.state;
  }

  /**
   * Restart workflow after completion
   */
  restart(expense: SearchTransaction, callbacks: WorkflowCallbacks): Promise<void> {
    if (this.isActive()) {
      throw new Error('Cannot restart active workflow');
    }
    return this.start(expense, callbacks);
  }
}

// Export singleton instance
export const duplicationWorkflow = new ExpenseDuplicationWorkflow();
