import { PromptModal, PromptModalOptions } from './modal-types';
import { modalManager } from './modal-manager';

export interface AmountModificationModalOptions {
  originalAmount: number;
  currency: string;
  expenseName?: string;
  onConfirm: (amount: number) => void | Promise<void>;
  onCancel?: () => void;
}

export class AmountModificationModal extends PromptModal {
  private originalAmount: number;
  private currency: string;
  private useOriginalClicked = false;
  private confirmClicked = false;

  constructor(options: AmountModificationModalOptions) {
    const formattedAmount = formatAmount(options.originalAmount, options.currency);
    const message = options.expenseName
      ? `Enter the amount for the duplicated expense "${options.expenseName}"`
      : 'Enter the amount for the duplicated expense';

    super({
      title: 'Modify Expense Amount',
      message,
      placeholder: formattedAmount,
      defaultValue: options.originalAmount.toString(),
      inputType: 'number',
      submitText: 'Confirm',
      cancelText: 'Use Original',
      onSubmit: async (value: string) => {
        const amount = parseFloat(value);
        if (!isNaN(amount) && amount > 0) {
          this.confirmClicked = true;
          await options.onConfirm(amount);
          this.close();
        }
      },
      onCancel: () => {
        // "Use Original" button clicked - continue workflow with original amount
        this.useOriginalClicked = true;
        options.onConfirm(options.originalAmount);
        this.close();
      },
      onClose: () => {
        // Only call onCancel if modal was closed via X button (not "Use Original" or "Confirm")
        if (!this.useOriginalClicked && !this.confirmClicked && options.onCancel) {
          options.onCancel();
        }
      },
      validate: (value: string) => {
        const amount = parseFloat(value);
        if (isNaN(amount)) {
          return 'Please enter a valid number';
        }
        if (amount <= 0) {
          return 'Amount must be greater than 0';
        }
        if (amount > 999999999) {
          return 'Amount is too large';
        }
        // Check for reasonable decimal places (max 2 for most currencies)
        const decimalPlaces = (value.split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          return 'Maximum 2 decimal places allowed';
        }
        return null;
      },
    });

    this.originalAmount = options.originalAmount;
    this.currency = options.currency;

    // Enhance the input with currency display
    this.enhanceInput();
  }

  private enhanceInput(): void {
    const element = this.getElement();
    const input = element.querySelector('.modal-input') as HTMLInputElement;
    const body = element.querySelector('.modal-body');

    if (input && body) {
      // Create currency display wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'amount-input-wrapper';
      wrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
      `;

      // Create currency label
      const currencyLabel = document.createElement('span');
      currencyLabel.className = 'currency-label';
      currencyLabel.textContent = this.currency;
      currencyLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        background: #f3f4f6;
        padding: 8px 12px;
        border-radius: 6px 0 0 6px;
        border: 1px solid #d1d5db;
        border-right: none;
      `;

      // Update input styles
      input.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 0 6px 6px 0;
        font-size: 14px;
        transition: border-color 0.2s ease;
        background: white;
        color: #111827;
      `;

      // Set input attributes for better UX
      input.setAttribute('step', '0.01');
      input.setAttribute('min', '0.01');
      input.setAttribute('max', '999999999');

      // Move input into wrapper
      input.parentNode?.removeChild(input);
      wrapper.appendChild(currencyLabel);
      wrapper.appendChild(input);

      // Find the message element and insert wrapper after it
      const message = body.querySelector('.modal-message');
      if (message) {
        message.insertAdjacentElement('afterend', wrapper);
      } else {
        body.insertBefore(wrapper, body.firstChild);
      }

      // Add comparison with original amount
      const comparison = document.createElement('div');
      comparison.className = 'amount-comparison';
      comparison.style.cssText = `
        margin-top: 12px;
        padding: 8px;
        background: #f9fafb;
        border-radius: 4px;
        font-size: 13px;
        color: #6b7280;
      `;
      comparison.innerHTML = `
        Original amount: <strong>${formatAmount(this.originalAmount, this.currency)}</strong>
      `;
      wrapper.insertAdjacentElement('afterend', comparison);

      // Update comparison on input change
      input.addEventListener('input', () => {
        const newAmount = parseFloat(input.value);
        if (!isNaN(newAmount) && newAmount !== this.originalAmount) {
          const difference = newAmount - this.originalAmount;
          const percentChange = ((difference / this.originalAmount) * 100).toFixed(1);
          const sign = difference > 0 ? '+' : '';

          comparison.innerHTML = `
            Original: <strong>${formatAmount(this.originalAmount, this.currency)}</strong>
            <span style="margin-left: 12px; color: ${difference > 0 ? '#059669' : '#dc2626'};">
              ${sign}${formatAmount(Math.abs(difference), this.currency)} (${sign}${percentChange}%)
            </span>
          `;
        } else {
          comparison.innerHTML = `
            Original amount: <strong>${formatAmount(this.originalAmount, this.currency)}</strong>
          `;
        }
      });

      // Focus and select input text
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);
    }
  }
}

function formatAmount(amount: number, currency: string): string {
  try {
    // Try to use Intl.NumberFormat for proper currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function showAmountModificationModal(
  options: AmountModificationModalOptions
): AmountModificationModal {
  const modal = new AmountModificationModal(options);
  modalManager.open(modal);
  return modal;
}
