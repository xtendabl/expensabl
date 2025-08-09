import { Modal } from './modal';
import { modalManager } from './modal-manager';

export interface SubmitDraftModalOptions {
  expenseName?: string;
  expenseAmount?: number;
  currency?: string;
  onSubmit: () => void | Promise<void>;
  onSaveAsDraft: () => void | Promise<void>;
  onCancel?: () => void;
}

export class SubmitDraftModal extends Modal {
  private onSubmit: () => void | Promise<void>;
  private onSaveAsDraft: () => void | Promise<void>;
  private onCancel?: () => void;

  constructor(options: SubmitDraftModalOptions) {
    const content = document.createElement('div');
    content.className = 'submit-draft-modal-content';

    const expenseInfo = options.expenseName
      ? `<p class="expense-info">Expense: <strong>${options.expenseName}</strong>${
          options.expenseAmount
            ? ` - ${options.currency || 'USD'} ${options.expenseAmount.toFixed(2)}`
            : ''
        }</p>`
      : '';

    content.innerHTML = `
      <div class="submit-draft-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
      </div>
      <div class="submit-draft-message">
        <h3>Ready to Submit?</h3>
        ${expenseInfo}
        <p>Choose how you'd like to proceed with your expense:</p>
      </div>
      <div class="submit-options">
        <div class="option-card submit-option">
          <div class="option-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12l5 5L20 7"></path>
            </svg>
          </div>
          <div class="option-content">
            <h4>Submit for Approval</h4>
            <p class="option-description">
              Submit the expense immediately for manager approval and processing.
              Use this for completed expenses ready for reimbursement.
            </p>
            <ul class="option-benefits">
              <li>Faster reimbursement</li>
              <li>Immediate processing</li>
              <li>Ready for approval workflow</li>
            </ul>
          </div>
        </div>
        <div class="option-divider">
          <span>OR</span>
        </div>
        <div class="option-card draft-option">
          <div class="option-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </div>
          <div class="option-content">
            <h4>Save as Draft</h4>
            <p class="option-description">
              Save the expense as a draft to complete or review later.
              Perfect for expenses that need additional receipts or information.
            </p>
            <ul class="option-benefits">
              <li>Add receipts later</li>
              <li>Review before submitting</li>
              <li>Complete missing information</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    super({
      title: 'Choose Submission Type',
      content,
      className: 'submit-draft-modal',
      closable: true,
      closeOnBackdrop: false,
      closeOnEsc: true,
      buttons: [
        {
          text: 'Cancel',
          className: 'modal-button-secondary',
          onClick: () => {
            if (this.onCancel) {
              this.onCancel();
            }
          },
        },
        {
          text: 'Save as Draft',
          className: 'modal-button-secondary draft-button',
          onClick: async () => {
            await this.handleSaveAsDraft();
          },
          closeOnClick: false,
        },
        {
          text: 'Submit Now',
          className: 'modal-button-primary submit-button',
          onClick: async () => {
            await this.handleSubmit();
          },
          closeOnClick: false,
        },
      ],
      onClose: () => {
        if (this.onCancel) {
          this.onCancel();
        }
      },
    });

    this.onSubmit = options.onSubmit;
    this.onSaveAsDraft = options.onSaveAsDraft;
    this.onCancel = options.onCancel;

    this.setupOptionCardListeners();
  }

  private setupOptionCardListeners(): void {
    // Add click handlers for option cards
    const element = this.getElement();

    const submitOption = element.querySelector('.submit-option');
    if (submitOption) {
      submitOption.addEventListener('click', () => {
        void this.handleSubmit();
      });
    }

    const draftOption = element.querySelector('.draft-option');
    if (draftOption) {
      draftOption.addEventListener('click', () => {
        void this.handleSaveAsDraft();
      });
    }
  }

  private async handleSubmit(): Promise<void> {
    try {
      // Disable buttons during processing
      this.disableButtons();
      await this.onSubmit();
      this.close();
    } catch (error) {
      // Re-enable buttons on error
      this.enableButtons();
      console.error('Submit failed:', error);
      // The parent component should handle error display
    }
  }

  private async handleSaveAsDraft(): Promise<void> {
    try {
      // Disable buttons during processing
      this.disableButtons();
      await this.onSaveAsDraft();
      this.close();
    } catch (error) {
      // Re-enable buttons on error
      this.enableButtons();
      console.error('Save as draft failed:', error);
      // The parent component should handle error display
    }
  }

  private disableButtons(): void {
    const buttons = this.getElement().querySelectorAll('.modal-button');
    buttons.forEach((button) => {
      (button as HTMLButtonElement).disabled = true;
    });

    // Also disable option cards
    const optionCards = this.getElement().querySelectorAll('.option-card');
    optionCards.forEach((card) => {
      card.classList.add('disabled');
    });
  }

  private enableButtons(): void {
    const buttons = this.getElement().querySelectorAll('.modal-button');
    buttons.forEach((button) => {
      (button as HTMLButtonElement).disabled = false;
    });

    // Also enable option cards
    const optionCards = this.getElement().querySelectorAll('.option-card');
    optionCards.forEach((card) => {
      card.classList.remove('disabled');
    });
  }
}

export function showSubmitDraftModal(options: SubmitDraftModalOptions): SubmitDraftModal {
  const modal = new SubmitDraftModal(options);
  modalManager.open(modal);
  return modal;
}
