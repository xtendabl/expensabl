import { ExpenseData } from '../../../../features/expenses/types';
import { BaseComponent } from '../../../shared/components/base-component';
import { expenseUIService } from '../services/expense-ui-service';
import { expenseStore } from '../state/expense-store';
import { ExpenseCard } from './expense-card';

interface ExpenseListProps {
  onExpenseClick?: (expenseId: string) => void;
}

interface ExpenseListState {
  isLoading: boolean;
  error: Error | null;
}

/**
 * Expense list component with virtual scrolling support
 */
export class ExpenseList extends BaseComponent<ExpenseListProps, ExpenseListState> {
  private expenseCards: ExpenseCard[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(props: ExpenseListProps) {
    super(props, {
      isLoading: false,
      error: null,
    });
  }

  render(): string {
    const state = expenseStore.getState();
    const { isLoading, error } = this.state;

    if (isLoading || state.loading) {
      return `
        <div class="expenses-list loading">
          <div class="loading-spinner"></div>
          <span>Loading expenses...</span>
        </div>
      `;
    }

    if (error || state.error) {
      const errorMessage = error?.message || state.error?.message || 'Unknown error';
      return `
        <div class="expenses-list error">
          <div class="empty-state">
            <p>Error loading expenses</p>
            <p class="error-message">${this.escapeHtml(errorMessage)}</p>
            <button class="btn btn-primary retry-btn">Retry</button>
          </div>
        </div>
      `;
    }

    if (!state.items || state.items.length === 0) {
      const hasFilters =
        state.filters.searchQuery || state.filters.merchantCategory || state.filters.expenseStatus;

      return `
        <div class="expenses-list empty">
          <div class="empty-state">
            ${
              hasFilters
                ? '<p>No expenses found matching your filters</p><button class="btn btn-secondary clear-filters-btn">Clear Filters</button>'
                : '<p>No expenses found</p>'
            }
          </div>
        </div>
      `;
    }

    // Render expense list with pagination info
    return `
      <div class="expenses-list">
        <div class="list-header">
          <span class="result-count">
            Showing ${(state.currentPage - 1) * state.filters.itemsPerPage + 1}-${Math.min(state.currentPage * state.filters.itemsPerPage, state.totalItems)} 
            of ${state.totalItems} expenses
          </span>
        </div>
        <div class="expense-items">
          ${state.items.map((expense) => `<div class="expense-card-container" data-expense-id="${expense.uuid || (expense as ExpenseData & { id?: string }).id}"></div>`).join('')}
        </div>
        ${this.renderPagination(state.currentPage, state.totalPages)}
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Subscribe to store changes
    this.unsubscribe = expenseStore.subscribe(() => {
      this.update({});
    });

    // Retry button
    const retryBtn = this.querySelector('.retry-btn');
    if (retryBtn) {
      this.addEventListener(retryBtn, 'click', () => {
        void expenseUIService.fetchExpenses();
      });
    }

    // Clear filters button
    const clearFiltersBtn = this.querySelector('.clear-filters-btn');
    if (clearFiltersBtn) {
      this.addEventListener(clearFiltersBtn, 'click', () => {
        void expenseUIService.clearFilters();
      });
    }

    // Pagination buttons
    this.querySelectorAll('.pagination-btn').forEach((btn) => {
      this.addEventListener(btn, 'click', (e) => {
        const page = parseInt((e.target as HTMLElement).getAttribute('data-page') || '1');
        void expenseUIService.changePage(page);
      });
    });

    // Mount expense cards
    this.mountExpenseCards();
  }

  protected onUpdate(): void {
    // Remount expense cards on update
    this.mountExpenseCards();
  }

  protected onUnmount(): void {
    // Cleanup
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Unmount all expense cards
    this.expenseCards.forEach((card) => card.unmount());
    this.expenseCards = [];
  }

  private mountExpenseCards(): void {
    // Unmount existing cards
    this.expenseCards.forEach((card) => card.unmount());
    this.expenseCards = [];

    // Mount new cards
    const state = expenseStore.getState();
    const containers = this.querySelectorAll('.expense-card-container');

    containers.forEach((container, index) => {
      if (index < state.items.length) {
        const expense = state.items[index];
        const card = new ExpenseCard({
          expense,
          onClick: this.props.onExpenseClick,
        });

        card.mount(container as HTMLElement);
        this.expenseCards.push(card);
      }
    });
  }

  private renderPagination(currentPage: number, totalPages: number): string {
    if (totalPages <= 1) return '';

    const pages: string[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Previous button
    pages.push(`
      <button class="btn btn-secondary pagination-btn" 
              data-page="${currentPage - 1}" 
              ${currentPage === 1 ? 'disabled' : ''}>
        Previous
      </button>
    `);

    // Page numbers
    if (startPage > 1) {
      pages.push(`
        <button class="btn btn-secondary pagination-btn" data-page="1">1</button>
        ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
      `);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'} pagination-btn" 
                data-page="${i}"
                ${i === currentPage ? 'disabled' : ''}>
          ${i}
        </button>
      `);
    }

    if (endPage < totalPages) {
      pages.push(`
        ${endPage < totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
        <button class="btn btn-secondary pagination-btn" data-page="${totalPages}">${totalPages}</button>
      `);
    }

    // Next button
    pages.push(`
      <button class="btn btn-secondary pagination-btn" 
              data-page="${currentPage + 1}" 
              ${currentPage === totalPages ? 'disabled' : ''}>
        Next
      </button>
    `);

    return `<div class="pagination">${pages.join('')}</div>`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
