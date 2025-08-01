import { ExpenseData } from '../../../../features/expenses/types';
import { BaseComponent } from '../../../shared/components/base-component';

interface ExpenseCardProps {
  expense: ExpenseData;
  onClick?: (expenseId: string) => void;
}

/**
 * Reusable expense card component
 */
export class ExpenseCard extends BaseComponent<ExpenseCardProps> {
  constructor(props: ExpenseCardProps) {
    super(props, {});
  }

  render(): string {
    const { expense } = this.props;

    // Extract display values
    const status = expense.status || 'unknown';
    const statusClass = status.toLowerCase();
    const amount = expense.accountAmount ?? 0;
    const currency = expense.accountCurrency || 'USD';
    const formattedAmount = `${currency} ${amount.toFixed(2)}`;
    const date = expense.authorizationDate || expense.instant || new Date().toISOString();
    const formattedDate = new Date(date).toLocaleDateString();
    const merchantName = expense.prettyMerchantName || expense.merchant?.name || 'Unknown Merchant';
    const policy = expense.policyName || 'Other';

    // Get expense ID (handle different API response formats)
    const expenseId = expense.uuid || (expense as ExpenseData & { id?: string }).id || '';

    return `
      <div class="expense-item" data-expense-id="${expenseId}">
        <div class="expense-main">
          <div class="expense-merchant">${this.escapeHtml(merchantName)}</div>
          <div class="expense-details">${formattedDate} • ${this.escapeHtml(policy)}</div>
          <span class="expense-status ${statusClass}">${status.toUpperCase()}</span>
        </div>
        <div class="expense-amount">${formattedAmount}</div>
        <div class="expense-arrow">›</div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    if (this.props.onClick) {
      this.addEventListener(this.element!, 'click', () => {
        const expenseId = this.element?.getAttribute('data-expense-id');
        if (expenseId && this.props.onClick) {
          this.props.onClick(expenseId);
        }
      });
    }
  }

  /**
   * Escapes HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
