/**
 * Sidepanel UI Handler
 * Manages all UI interactions and event handling for the sidepanel
 */
import {
  getSearchTransactionDisplayData,
  mapSearchTransactionArray,
  searchTransactionToCreatePayload,
} from '../features/expenses/mappers/search-transaction-mapper';
import { FieldConfigurationService } from '../features/expenses/services/field-configuration-service';
import { ExpenseCreatePayload, SearchTransaction } from '../features/expenses/types';
import { ScheduleCalculator } from '../features/templates/scheduler';
import { ExpenseTemplate, TemplateScheduling } from '../features/templates/types';

// Type for expense data with receipt fields
interface ExpenseWithReceipts {
  receiptKey?: string;
  ereceiptKey?: string;
  receiptThumbnailKey?: string;
  ereceiptThumbnailKey?: string;
  receiptPageCount?: number;
  [key: string]: unknown; // Allow other fields
}
import {
  chromeLogger as logger,
  error,
  info,
  warn,
} from '../shared/services/logger/chrome-logger-setup';
import { HelpContentBuilder } from './builders/help-content-builder';
import { FieldSettings } from './components/field-settings';
import {
  showAmountModificationModal,
  showAuthenticationModal,
  showReceiptUploadModal,
} from './components/modals';
import { loading } from './components/modals/modal-types';
import { duplicationWorkflow } from './components/workflows/expense-duplication-workflow';
import { HELP_CONTENT } from './constants/help-content';
import { ExpenseDetailWithReceipt } from './domains/expenses/components/expense-detail-with-receipt';

interface UIState {
  expenses: SearchTransaction[];
  templates: ExpenseTemplate[];
  currentExpense: SearchTransaction | null;
  currentTemplate: ExpenseTemplate | null;
  isLoading: boolean;
  searchActive: boolean;
  searchFilters: {
    merchant?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

// Global tracker for pending expense creation requests
const pendingExpenseRequests = new Set<string>();

export class SidepanelUI {
  private state: UIState = {
    expenses: [],
    templates: [],
    currentExpense: null,
    currentTemplate: null,
    isLoading: false,
    searchActive: false,
    searchFilters: {},
  };

  private sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
  private scheduleCalculator: ScheduleCalculator;
  private isApplyingTemplate = false;
  private currentReceiptComponent: ExpenseDetailWithReceipt | null = null;

  constructor(sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>) {
    this.sendMessage = sendMessage;
    this.scheduleCalculator = new ScheduleCalculator();
  }

  private initializeCount = 0;

  private injectStyles(): void {
    // Add expense detail styles if not already present
    if (!document.getElementById('expense-detail-styles')) {
      const style = document.createElement('style');
      style.id = 'expense-detail-styles';
      style.textContent = `
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .open-in-navan-link {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #3b82f6;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .open-in-navan-link:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .btn-customize-fields {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        .btn-customize-fields:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .btn-customize-fields:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        .btn-customize-fields .customize-icon {
          font-size: 16px;
          display: inline-block;
        }

        .btn-customize-fields .customize-text {
          display: inline-block;
        }
      `;
      document.head.appendChild(style);
    }
  }

  initialize(): void {
    this.initializeCount++;
    info('SidepanelUI: Initializing...', { count: this.initializeCount });

    if (this.initializeCount > 1) {
      warn('SidepanelUI: Already initialized!', { count: this.initializeCount });
      return;
    }

    this.injectStyles();
    this.attachEventListeners();
    this.initializeCollapsibleSections();
    void this.initializeDarkMode();
    this.injectHelpContent();

    // Load initial data (templates)
    void this.loadInitialData();

    // Add debug command for development
    (window as Window & { debugScheduling?: () => void }).debugScheduling = () => {
      void this.debugScheduling();
    };
    info(
      'SidepanelUI: Initialization complete. Run debugScheduling() in console to check scheduling status.'
    );
  }

  private attachEventListeners(): void {
    logger.debug('ATTACH_EVENT_LISTENERS_START', {
      timestamp: Date.now(),
    });

    // Settings section
    this.setupCollapsible('settingsHeader', 'settingsContent', 'settingsToggle');
    this.attachSettingsHandlers();

    // Help section
    this.setupCollapsible('helpHeader', 'helpContent', 'helpToggle');

    // Expenses section
    this.setupCollapsible('expensesHeader', 'expensesContent', 'expensesToggle');
    this.attachExpenseHandlers();

    // Templates section
    this.setupCollapsible('templatesHeader', 'templatesContent', 'templatesToggle');
    this.attachTemplateHandlers();

    logger.debug('ATTACH_EVENT_LISTENERS_COMPLETE', {
      timestamp: Date.now(),
    });
  }

  private setupCollapsible(headerId: string, contentId: string, toggleId: string): void {
    const header = document.getElementById(headerId);
    const content = document.getElementById(contentId);
    const toggle = document.getElementById(toggleId);

    if (header && content && toggle) {
      header.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggle.classList.toggle('expanded', isHidden);
      });
    }
  }

  private attachSettingsHandlers(): void {
    // Search enabled setting
    const searchEnabledCheckbox = document.getElementById('searchEnabled') as HTMLInputElement;
    if (searchEnabledCheckbox) {
      // Load saved setting
      void chrome.storage.local.get('expenseSearchEnabled').then((result) => {
        searchEnabledCheckbox.checked = result.expenseSearchEnabled !== false; // Default to true
      });

      // Save setting on change
      searchEnabledCheckbox.addEventListener('change', () => {
        const isEnabled = searchEnabledCheckbox.checked;
        void chrome.storage.local.set({ expenseSearchEnabled: isEnabled });

        // Show/hide search section immediately
        const searchSection = document.getElementById('expenseSearch');
        if (searchSection) {
          searchSection.style.display = isEnabled ? 'block' : 'none';
        }

        this.showToast(
          'Setting Updated',
          `Expense search has been ${isEnabled ? 'enabled' : 'disabled'}`,
          'success'
        );
      });
    }

    // Auto-fetch expenses setting
    const autoFetchCheckbox = document.getElementById('autoFetchExpenses') as HTMLInputElement;
    if (autoFetchCheckbox) {
      // Load saved setting
      void chrome.storage.local.get('autoFetchExpenses').then((result) => {
        autoFetchCheckbox.checked = result.autoFetchExpenses !== false; // Default to true
      });

      // Save setting on change
      autoFetchCheckbox.addEventListener('change', () => {
        const isEnabled = autoFetchCheckbox.checked;
        void chrome.storage.local.set({ autoFetchExpenses: isEnabled });

        this.showToast(
          'Setting Updated',
          `Auto-fetch expenses has been ${isEnabled ? 'enabled' : 'disabled'}`,
          'success'
        );
      });
    }
  }

  private attachExpenseHandlers(): void {
    // Fetch expenses button
    const fetchBtn = document.getElementById('fetchExpenses');
    if (fetchBtn) {
      fetchBtn.addEventListener('click', () => void this.handleFetchExpenses());
    }

    // Refresh expenses button
    const refreshBtn = document.getElementById('refreshExpenses');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => void this.handleFetchExpenses());
    }

    // Search functionality
    const performSearchBtn = document.getElementById('performSearch');
    if (performSearchBtn) {
      performSearchBtn.addEventListener('click', () => void this.handlePerformSearch());
    }

    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => void this.handleClearSearch());
    }

    // Add enter key support for search inputs
    const merchantSearchInput = document.getElementById('merchantSearch') as HTMLInputElement;
    const dateFromInput = document.getElementById('dateFromSearch') as HTMLInputElement;
    const dateToInput = document.getElementById('dateToSearch') as HTMLInputElement;

    [merchantSearchInput, dateFromInput, dateToInput].forEach((input) => {
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            void this.handlePerformSearch();
          }
        });
      }
    });

    // Back to list button
    const backBtn = document.getElementById('backToList');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.showExpenseList());
    }

    // Duplicate expense button
    const duplicateBtn = document.getElementById('duplicateExpense');
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => void this.handleDuplicateExpense());
    }

    // Save as template button
    const saveTemplateBtn = document.getElementById('saveAsTemplate');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', () => void this.handleSaveAsTemplate());
    }

    // Sorting and filtering controls
    const sortOrder = document.getElementById('sortOrder') as HTMLSelectElement;
    if (sortOrder) {
      sortOrder.addEventListener('change', () => this.handleSortChange());
    }

    const itemsPerPage = document.getElementById('itemsPerPage') as HTMLSelectElement;
    if (itemsPerPage) {
      itemsPerPage.addEventListener('change', () => this.handlePaginationChange());
    }

    const merchantCategory = document.getElementById('merchantCategory') as HTMLSelectElement;
    if (merchantCategory) {
      merchantCategory.addEventListener('change', () => this.handleFilterChange());
    }

    const expenseStatus = document.getElementById('expenseStatus') as HTMLSelectElement;
    if (expenseStatus) {
      expenseStatus.addEventListener('change', () => this.handleFilterChange());
    }

    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => this.handleClearFilters());
    }
  }

  private attachTemplateHandlers(): void {
    // Back to templates button
    const backBtn = document.getElementById('backToTemplates');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.showTemplateList());
    }

    // Template edit toggle
    const editToggle = document.getElementById('toggleTemplateEdit');
    if (editToggle) {
      editToggle.addEventListener('click', () => this.toggleTemplateEdit());
    }

    // Save template button
    const saveBtn = document.getElementById('saveTemplate');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => void this.handleSaveTemplate());
    }

    // Cancel template edit
    const cancelBtn = document.getElementById('cancelTemplateEdit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelTemplateEdit());
    }

    // Apply template button
    const applyBtn = document.getElementById('applyTemplate');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        logger.debug('DETAIL_APPLY_BUTTON_CLICK', {
          templateId: this.state.currentTemplate?.id,
          timestamp: Date.now(),
        });
        void this.handleApplyTemplate();
      });
    }

    // Duplicate template button
    const duplicateBtn = document.getElementById('duplicateTemplate');
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => void this.handleDuplicateTemplate());
    }

    // Delete template button
    const deleteBtn = document.getElementById('deleteTemplate');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => void this.handleDeleteTemplate());
    }

    // Template dialog handlers
    const closeDialogBtn = document.getElementById('closeTemplateDialog');
    if (closeDialogBtn) {
      closeDialogBtn.addEventListener('click', () => this.closeTemplateDialog());
    }

    const cancelCreationBtn = document.getElementById('cancelTemplateCreation');
    if (cancelCreationBtn) {
      cancelCreationBtn.addEventListener('click', () => this.closeTemplateDialog());
    }

    const createTemplateBtn = document.getElementById('createTemplate');
    if (createTemplateBtn) {
      info('Attaching click listener to createTemplate button');
      createTemplateBtn.addEventListener('click', () => void this.handleCreateTemplate());
    } else {
      error('createTemplate button not found in DOM');
    }

    // Scheduling handlers
    const enableScheduling = document.getElementById('enableScheduling') as HTMLInputElement;
    if (enableScheduling) {
      enableScheduling.addEventListener('change', () => this.handleSchedulingToggle());
    }

    // Frequency radio buttons
    const frequencyRadios = document.querySelectorAll('input[name="frequency"]');
    frequencyRadios.forEach((radio) => {
      radio.addEventListener('change', () => this.handleFrequencyChange());
    });

    // Time input changes
    const hourSelect = document.getElementById('hour') as HTMLSelectElement;
    const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
    const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;
    const customIntervalSelect = document.getElementById('customInterval') as HTMLSelectElement;

    if (hourSelect) hourSelect.addEventListener('change', () => this.updateSchedulingPreview());
    if (minuteSelect) minuteSelect.addEventListener('change', () => this.updateSchedulingPreview());
    if (ampmSelect) ampmSelect.addEventListener('change', () => this.updateSchedulingPreview());
    if (customIntervalSelect)
      customIntervalSelect.addEventListener('change', () => this.updateSchedulingPreview());

    // Weekly day checkboxes
    const dayCheckboxes = document.querySelectorAll('.weekly-settings input[type="checkbox"]');
    dayCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.updateSchedulingPreview());
    });

    // Monthly day select
    const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
    if (dayOfMonthSelect) {
      dayOfMonthSelect.addEventListener('change', () => this.updateSchedulingPreview());
    }

    // Pause/Resume scheduling
    const pauseBtn = document.getElementById('pauseSchedule');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => void this.handlePauseSchedule());
    }

    const resumeBtn = document.getElementById('resumeSchedule');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => void this.handleResumeSchedule());
    }
  }

  private async handlePerformSearch(): Promise<void> {
    info('SidepanelUI: handlePerformSearch called');

    const merchantInput = document.getElementById('merchantSearch') as HTMLInputElement;
    const dateFromInput = document.getElementById('dateFromSearch') as HTMLInputElement;
    const dateToInput = document.getElementById('dateToSearch') as HTMLInputElement;
    const status = document.getElementById('expensesStatus');

    if (!status) return;

    // Get search values
    const merchant = merchantInput?.value.trim() || '';
    const dateFrom = dateFromInput?.value || '';
    const dateTo = dateToInput?.value || '';

    // Check if any search criteria is provided
    if (!merchant && !dateFrom && !dateTo) {
      this.showToast(
        'Search Criteria Required',
        'Please enter at least one search criterion',
        'info'
      );
      return;
    }

    // Update search state
    this.state.searchActive = true;
    this.state.searchFilters = {
      merchant: merchant || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    // Show loading state
    this.setLoading(true);
    status.textContent = 'Searching expenses...';
    status.className = 'expenses-status';

    try {
      // Build search parameters for Navan API
      const searchParams: Record<string, string> = {};

      if (merchant) {
        searchParams.q = merchant;
      }

      if (dateFrom || dateTo) {
        // Format dates for Navan API (ISO 8601 format)
        if (dateFrom) {
          searchParams['authorizationInstant.from'] = new Date(dateFrom).toISOString();
        }
        if (dateTo) {
          // Add 23:59:59 to include the entire day
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          searchParams['authorizationInstant.to'] = endDate.toISOString();
        }
      }

      info('SidepanelUI: Sending search request with params:', searchParams);

      // Send search request
      const response = await this.sendMessage({
        action: 'searchExpenses',
        filters: searchParams,
      });

      if (response.success && response.expenses) {
        // Map the search results
        const mappedExpenses = mapSearchTransactionArray(response.expenses as unknown[]);
        this.state.expenses = mappedExpenses;

        // Update status
        status.textContent = `Found ${mappedExpenses.length} expense${mappedExpenses.length !== 1 ? 's' : ''} matching your search`;
        status.className = 'expenses-status success';

        // Show the expense list
        const list = document.getElementById('expensesList');
        if (list) list.style.display = 'block';

        // Render the search results
        this.renderExpenses();

        // Show success toast
        this.showToast(
          'Search Complete',
          `Found ${mappedExpenses.length} matching expense${mappedExpenses.length !== 1 ? 's' : ''}`,
          'success'
        );
      } else {
        status.textContent = (response.error as string) || 'Search failed';
        status.className = 'expenses-status error';
        this.showToast(
          'Search Failed',
          (response.error as string) || 'Unable to search expenses',
          'error'
        );
      }
    } catch (err) {
      error('Failed to search expenses:', { error: err });
      status.textContent = 'Error searching expenses';
      status.className = 'expenses-status error';
      this.showToast('Search Error', 'An error occurred while searching', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  private async handleClearSearch(): Promise<void> {
    info('SidepanelUI: handleClearSearch called');

    // Clear search inputs
    const merchantInput = document.getElementById('merchantSearch') as HTMLInputElement;
    const dateFromInput = document.getElementById('dateFromSearch') as HTMLInputElement;
    const dateToInput = document.getElementById('dateToSearch') as HTMLInputElement;

    if (merchantInput) merchantInput.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';

    // Clear search state
    this.state.searchActive = false;
    this.state.searchFilters = {};

    // Reload all expenses
    await this.handleFetchExpenses();
  }

  private async handleFetchExpenses(): Promise<void> {
    info('SidepanelUI: handleFetchExpenses called');

    const fetchBtn = document.getElementById('fetchExpenses') as HTMLButtonElement;
    const refreshBtn = document.getElementById('refreshExpenses') as HTMLButtonElement;
    const status = document.getElementById('expensesStatus');
    const list = document.getElementById('expensesList');
    const controls = document.getElementById('expenseControls');
    const searchSection = document.getElementById('expenseSearch');

    if (!status) {
      error('SidepanelUI: Expenses status element not found');
      return;
    }

    // First check authentication status
    info('SidepanelUI: Checking authentication status');
    try {
      const authResponse = await this.sendMessage({ action: 'checkAuth' });
      info('SidepanelUI: Auth response:', authResponse);

      if (!authResponse.success || !authResponse.hasToken || !authResponse.isValid) {
        status.textContent = 'Authentication required';
        status.className = 'expenses-status error';
        if (fetchBtn) fetchBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;

        // Show authentication modal
        showAuthenticationModal({
          sendMessage: this.sendMessage,
          onAuthenticated: async () => {
            // Retry fetching expenses after successful authentication
            await this.handleFetchExpenses();
          },
          onCancel: () => {
            info('SidepanelUI: Authentication cancelled by user');
          },
        });

        return;
      }
    } catch (err) {
      error('SidepanelUI: Auth check failed:', { error: err });
    }

    // Update UI state
    this.setLoading(true);
    if (fetchBtn) fetchBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;
    status.innerHTML = '<span class="loading-spinner"></span>Fetching expenses...';
    status.className = 'expenses-status';

    info('SidepanelUI: Sending getExpenses message');

    try {
      // Fetch all expenses without filters (API doesn't support them)
      const response = await this.sendMessage({
        action: 'getExpenses',
      });

      if (response.success && response.expenses) {
        // Map the raw API response to our SearchTransaction type
        const mappedExpenses = mapSearchTransactionArray(response.expenses as unknown[]);
        this.state.expenses = mappedExpenses;
        status.textContent = `Found ${mappedExpenses.length} expenses`;
        status.className = 'expenses-status success';

        // Show UI elements
        if (fetchBtn) fetchBtn.style.display = 'none';
        if (refreshBtn) refreshBtn.style.display = 'inline-block';
        if (list) list.style.display = 'block';
        if (controls) controls.style.display = 'flex';

        // Show search section based on settings
        if (searchSection) {
          const result = await chrome.storage.local.get('expenseSearchEnabled');
          const isSearchEnabled = result.expenseSearchEnabled !== false; // Default to true
          searchSection.style.display = isSearchEnabled ? 'block' : 'none';
        }

        // Render expenses
        this.renderExpenses();

        // Also fetch templates
        await this.fetchTemplates();
      } else {
        status.textContent = (response.error as string) || 'Failed to fetch expenses';
        status.className = 'expenses-status error';
      }
    } catch (err) {
      status.textContent = 'Error fetching expenses';
      status.className = 'expenses-status error';
      error('Failed to fetch expenses:', { error: err });
    } finally {
      this.setLoading(false);
      if (fetchBtn) fetchBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  private async fetchTemplates(): Promise<void> {
    const templatesStatus = document.getElementById('templatesStatus');

    try {
      const response = await this.sendMessage({ action: 'getTemplates' });

      if (response.success && response.templates) {
        this.state.templates = response.templates as ExpenseTemplate[];
        if (templatesStatus) {
          templatesStatus.textContent = `${(response.templates as ExpenseTemplate[]).length} template(s) available`;
          templatesStatus.className = 'templates-status success';
        }

        // Always render templates to update the UI, even if the list is empty
        const templateList = document.getElementById('templateList');
        if (templateList) {
          templateList.style.display = 'block';
          this.renderTemplates();
        }
      }
    } catch (err) {
      error('Failed to fetch templates:', { error: err });
    }
  }

  private renderExpenses(): void {
    const list = document.getElementById('expensesList');
    if (!list || !this.state.expenses.length) return;

    // Get filter values
    const statusFilter = (document.getElementById('expenseStatus') as HTMLSelectElement)?.value;
    const categoryFilter = (document.getElementById('merchantCategory') as HTMLSelectElement)
      ?.value;
    const itemsPerPage = parseInt(
      (document.getElementById('itemsPerPage') as HTMLSelectElement)?.value || '20'
    );
    const sortOrder = (document.getElementById('sortOrder') as HTMLSelectElement)?.value;

    // Filter expenses
    let filteredExpenses = [...this.state.expenses];

    // Apply status filter
    if (statusFilter) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.expenseProperties.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.merchant.categoryGroup === categoryFilter
      );
    }

    // Apply sorting
    if (sortOrder) {
      filteredExpenses.sort((a, b) => {
        switch (sortOrder) {
          case 'date-desc':
            return (
              new Date(b.authorizationDate).getTime() - new Date(a.authorizationDate).getTime()
            );
          case 'date-asc':
            return (
              new Date(a.authorizationDate).getTime() - new Date(b.authorizationDate).getTime()
            );
          case 'amount-desc':
            return b.merchantAmount - a.merchantAmount;
          case 'amount-asc':
            return a.merchantAmount - b.merchantAmount;
          case 'merchant-asc':
            return a.merchant.name.localeCompare(b.merchant.name);
          case 'merchant-desc':
            return b.merchant.name.localeCompare(a.merchant.name);
          default:
            return 0;
        }
      });
    }

    // Apply pagination (limit)
    const displayExpenses = filteredExpenses.slice(0, itemsPerPage);

    // Update status to show filtered count
    const status = document.getElementById('expensesStatus');
    if (status) {
      status.textContent = `Showing ${displayExpenses.length} of ${filteredExpenses.length} expenses${filteredExpenses.length < this.state.expenses.length ? ' (filtered)' : ''}`;
    }

    list.innerHTML = displayExpenses
      .map((expense) => {
        // Use the helper to get display-friendly data
        const displayData = getSearchTransactionDisplayData(expense);

        return `
      <div class="expense-item" data-expense-id="${displayData.id}">
        <div class="expense-main">
          <div class="expense-merchant">${displayData.merchant}</div>
          <div class="expense-details">${new Date(displayData.date).toLocaleDateString()} • ${displayData.category || 'Uncategorized'}</div>
          <div class="expense-details">${expense.policyName || 'No description'}</div>
          <div class="expense-id">ID: ${displayData.id}</div>
          ${displayData.status ? `<span class="expense-status ${displayData.status.toLowerCase()}">${displayData.status}</span>` : ''}
        </div>
        <div>
          <div class="expense-amount">${displayData.currency} ${displayData.amount.toFixed(2)}</div>
        </div>
        <div class="expense-arrow">›</div>
      </div>
    `;
      })
      .join('');

    // Attach click handlers to expense items
    list.querySelectorAll('.expense-item').forEach((item) => {
      item.addEventListener('click', () => {
        const expenseId = item.getAttribute('data-expense-id');
        if (expenseId) {
          void this.showExpenseDetail(expenseId);
        }
      });
    });
  }

  private renderTemplates(): void {
    logger.debug('RENDER_TEMPLATES', {
      count: this.state.templates.length,
      timestamp: Date.now(),
    });

    const listContent = document.getElementById('templateListContent');
    if (!listContent) return;

    if (this.state.templates.length === 0) {
      listContent.innerHTML = `
        <div class="template-empty">
          <h4>No templates yet</h4>
          <p>Save expenses as templates to reuse them later</p>
        </div>
      `;
      return;
    }

    listContent.innerHTML = this.state.templates
      .map(
        (template) => `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-header">
          <div class="template-name">${template.name}</div>
          <div class="template-actions">
            <button class="btn-icon" data-action="edit" title="Edit">✏️</button>
            <button class="btn-icon" data-action="duplicate" title="Duplicate">📋</button>
            <button class="btn-icon" data-action="delete" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="template-details">
          <div class="template-merchant">${template.expenseData.merchant?.name || 'Unknown Merchant'}</div>
          <div class="template-amount">${template.expenseData.merchantCurrency || 'USD'} ${template.expenseData.merchantAmount || 0}</div>
          <div class="template-meta">
            <span>Used ${template.metadata?.useCount || 0} times</span>
            ${template.scheduling?.enabled ? '<span class="scheduling-indicator active"><span class="icon-clock"></span> Scheduled</span>' : ''}
          </div>
        </div>
        <div class="template-footer">
          <button class="btn btn-primary btn-sm" data-action="apply">Apply Template</button>
        </div>
      </div>
    `
      )
      .join('');

    // Attach event handlers to template actions
    listContent.querySelectorAll('.template-item').forEach((item) => {
      const templateId = item.getAttribute('data-template-id');
      if (!templateId) return;

      item.querySelectorAll('[data-action]').forEach((actionBtn) => {
        actionBtn.addEventListener('click', (e) => {
          logger.debug('CARD_BUTTON_CLICK', {
            action: actionBtn.getAttribute('data-action'),
            templateId,
            timestamp: Date.now(),
            bubbles: e.bubbles,
            eventPhase: e.eventPhase,
          });
          e.stopPropagation();
          e.preventDefault(); // Also prevent default behavior
          const action = actionBtn.getAttribute('data-action');
          this.handleTemplateAction(templateId, action);
        });
      });

      // Click on template item shows detail
      item.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).hasAttribute('data-action')) {
          void this.showTemplateDetail(templateId);
        }
      });
    });
  }

  private async showExpenseDetail(expenseId: string): Promise<void> {
    const expense = this.state.expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    this.state.currentExpense = expense;

    // Fetch full expense details to get receipt information
    let fullExpenseData: ExpenseWithReceipts | null = null;
    try {
      info('Fetching full expense details for:', expenseId);
      const response = await this.sendMessage({
        action: 'fetchExpense',
        payload: { expenseId },
      });
      info('Fetch expense response:', response);
      if (response?.success && response.expense) {
        // The message adapter returns expense, not data
        fullExpenseData = response.expense as ExpenseWithReceipts;
        info('Full expense data received:', {
          hasReceiptKey: !!fullExpenseData?.receiptKey,
          hasEreceiptKey: !!fullExpenseData?.ereceiptKey,
          receiptKey: fullExpenseData?.receiptKey,
          ereceiptKey: fullExpenseData?.ereceiptKey,
        });
      } else if (response?.data) {
        // Handle potential alternative format
        fullExpenseData = response.data as ExpenseWithReceipts;
        info('Full expense data received (data format):', {
          hasReceiptKey: !!fullExpenseData?.receiptKey,
          hasEreceiptKey: !!fullExpenseData?.ereceiptKey,
          receiptKey: fullExpenseData?.receiptKey,
          ereceiptKey: fullExpenseData?.ereceiptKey,
        });
      }
    } catch (error) {
      warn('Failed to fetch full expense details:', error);
    }

    // Hide list, show detail
    const listContainer = document.querySelector('.expenses-container') as HTMLElement;
    const detailView = document.getElementById('expenseDetail');
    const detailContent = document.getElementById('expenseDetailContent');

    if (listContainer) listContainer.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    if (detailContent) {
      // Use the field configuration service to get the user's selected fields
      const displayFields = await FieldConfigurationService.getDisplayFields(
        fullExpenseData || expense
      );

      // Build the detail HTML from the configured fields
      let detailHTML = '';
      for (const field of displayFields) {
        if (field.id === 'status') {
          // Special handling for status field to include styling
          detailHTML += `
            <div class="detail-field">
              <span class="detail-label">${field.label}</span>
              <span class="detail-value">
                <span class="expense-status ${field.value.toLowerCase()}">${field.value}</span>
              </span>
            </div>
          `;
        } else if (field.id === 'amount') {
          // Special handling for amount field to include highlight
          detailHTML += `
            <div class="detail-field">
              <span class="detail-label">${field.label}</span>
              <span class="detail-value highlight">${field.value}</span>
            </div>
          `;
        } else {
          detailHTML += `
            <div class="detail-field">
              <span class="detail-label">${field.label}</span>
              <span class="detail-value">${field.value}</span>
            </div>
          `;
        }
      }

      // Add a header with expense ID, settings button and open in Navan link
      detailHTML = `
        <div class="detail-header">
          <a href="https://app.navan.com/app/liquid/user/transactions/details-new/${expenseId}" 
             target="_blank" 
             rel="noopener noreferrer"
             class="open-in-navan-link"
             title="Open expense ${expenseId} in Navan web app">
            Open expense ${expenseId} in Navan 
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-left: 4px;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <button class="btn-customize-fields" id="customizeFields" 
                  title="Customize which fields are displayed and their order. Select up to 8 fields to show in expense details."
                  aria-label="Customize display fields">
            <span class="customize-icon">⚙️</span>
            <span class="customize-text">Customize Display</span>
          </button>
        </div>
        <div class="detail-field expense-id-field">
          <span class="detail-label">Expense ID</span>
          <span class="detail-value">${expenseId}</span>
        </div>
        ${detailHTML}
      `;

      detailContent.innerHTML = detailHTML;

      // Add receipt upload section
      const receiptContainer = document.createElement('div');
      receiptContainer.id = 'expenseDetailReceiptSection';
      detailContent.appendChild(receiptContainer);

      // Initialize receipt upload component with full expense data
      this.initializeReceiptUpload(expenseId, receiptContainer, fullExpenseData || undefined);

      // Add event listener for customize fields button
      const customizeBtn = detailContent.querySelector('#customizeFields');
      if (customizeBtn) {
        customizeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showFieldSettings();
        });
      }
    }
  }

  private showExpenseList(): void {
    const listContainer = document.querySelector('.expenses-container') as HTMLElement;
    const detailView = document.getElementById('expenseDetail');

    if (listContainer) listContainer.style.display = 'block';
    if (detailView) detailView.style.display = 'none';

    // Clean up receipt component
    if (this.currentReceiptComponent) {
      this.currentReceiptComponent.destroy();
      this.currentReceiptComponent = null;
    }
  }

  private initializeReceiptUpload(
    expenseId: string,
    container: HTMLElement,
    fullExpenseData?: ExpenseWithReceipts
  ): void {
    // Clean up any existing component
    if (this.currentReceiptComponent) {
      this.currentReceiptComponent.destroy();
      this.currentReceiptComponent = null;
    }

    // Get the expense to check for existing receipts
    // Use full expense data if available, otherwise fall back to current expense
    const expense: ExpenseWithReceipts | SearchTransaction | null =
      fullExpenseData || this.state.currentExpense;
    const existingReceipts: Array<{
      key: string;
      url?: string;
      thumbnail?: string;
      pageCount?: number;
    }> = [];

    // Cast to ExpenseWithReceipts for receipt checking
    const expenseWithReceipts = expense as ExpenseWithReceipts;

    info('Checking for receipts in expense data:', {
      hasFullData: !!fullExpenseData,
      hasExpense: !!expense,
      receiptKey: expenseWithReceipts?.receiptKey,
      ereceiptKey: expenseWithReceipts?.ereceiptKey,
      receiptThumbnailKey: expenseWithReceipts?.receiptThumbnailKey,
      ereceiptThumbnailKey: expenseWithReceipts?.ereceiptThumbnailKey,
    });

    // Only check for regular user-uploaded receipts (ignore e-receipts)
    // E-receipts are auto-generated by Navan and not user documents
    // Note: Navan combines all uploaded receipts into a single multi-page document
    if (
      expenseWithReceipts &&
      expenseWithReceipts.receiptKey &&
      expenseWithReceipts.receiptKey !== null &&
      expenseWithReceipts.receiptKey !== '' &&
      typeof expenseWithReceipts.receiptKey === 'string'
    ) {
      const receiptKey = expenseWithReceipts.receiptKey;
      const receiptData = {
        key: receiptKey,
        url: '', // Not used anymore since we handle viewing differently
        thumbnail: '', // Not used anymore since we use file type badges
        pageCount: expenseWithReceipts.receiptPageCount, // Store page count for display
      };
      existingReceipts.push(receiptData);
      info('Added user receipt document:', {
        receiptKey,
        receiptPageCount: expenseWithReceipts.receiptPageCount,
      });
    }

    // Skip e-receipts entirely - they are auto-generated transaction summaries, not user uploads
    if (expenseWithReceipts?.ereceiptKey) {
      info('Ignoring e-receipt (auto-generated):', {
        ereceiptKey: expenseWithReceipts.ereceiptKey,
      });
    }

    info('Total existing receipts found:', existingReceipts.length);

    // Create new receipt upload component
    this.currentReceiptComponent = new ExpenseDetailWithReceipt(container, {
      expenseId,
      existingReceipts,
      onReceiptUpload: (receiptKey: string) => {
        info('Receipt uploaded successfully:', receiptKey);
        this.showToast('Receipt Uploaded', 'Receipt has been attached to the expense', 'success');
        // Refresh expense data to show new receipt
        void this.handleFetchExpenses();
      },
      onError: (errorMessage: string) => {
        error('Receipt upload error:', errorMessage);
        this.showToast('Upload Failed', errorMessage, 'error');
      },
    });

    // Render the component
    this.currentReceiptComponent.render();
  }

  private async showTemplateDetail(templateId: string): Promise<void> {
    const template = this.state.templates.find((t) => t.id === templateId);
    if (!template) return;

    this.state.currentTemplate = template;

    // Hide list, show detail
    const templateList = document.getElementById('templateList');
    const templateDetail = document.getElementById('templateDetail');

    if (templateList) templateList.style.display = 'none';
    if (templateDetail) templateDetail.style.display = 'block';

    // Update detail view
    this.updateTemplateDetailView();
  }

  private showTemplateList(): void {
    const templateList = document.getElementById('templateList');
    const templateDetail = document.getElementById('templateDetail');

    if (templateList) templateList.style.display = 'block';
    if (templateDetail) templateDetail.style.display = 'none';
  }

  private updateTemplateDetailView(): void {
    if (!this.state.currentTemplate) return;

    const template = this.state.currentTemplate;
    const detailContent = document.getElementById('templateDetailContent');
    const titleElement = document.getElementById('templateDetailTitle');

    if (titleElement) {
      titleElement.textContent = template.name;
    }

    if (detailContent) {
      detailContent.innerHTML = `
        <div class="detail-field">
          <span class="detail-label">Template Name</span>
          <span class="detail-value">${template.name}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Merchant</span>
          <span class="detail-value">${template.expenseData.merchant?.name || 'Unknown'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Amount</span>
          <span class="detail-value highlight">${template.expenseData.merchantCurrency || 'USD'} ${template.expenseData.merchantAmount || 0}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Category</span>
          <span class="detail-value">${template.expenseData.details?.category || 'Uncategorized'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Description</span>
          <span class="detail-value">${template.expenseData.details?.description || 'No description'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Usage Count</span>
          <span class="detail-value">${template.metadata?.useCount || 0} times</span>
        </div>
        ${
          template.scheduling?.enabled
            ? `
          <div class="detail-field">
            <span class="detail-label">Scheduling</span>
            <span class="detail-value">
              <span class="scheduling-indicator ${template.scheduling.paused ? 'paused' : 'active'}">
                ${template.scheduling.paused ? 'Paused' : 'Active'}
              </span>
            </span>
          </div>
        `
            : ''
        }
      `;
    }

    // Show/hide execution history if template has been used
    const historySection = document.getElementById('executionHistory');
    if (historySection) {
      // Show history if template has any executions or has been used
      const hasHistory =
        (template.executionHistory && template.executionHistory.length > 0) ||
        template.metadata?.useCount > 0;
      historySection.style.display = hasHistory ? 'block' : 'none';

      // Render execution history
      if (hasHistory) {
        this.renderExecutionHistory(template);
      }
    }
  }

  private renderExecutionHistory(template: ExpenseTemplate): void {
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) return;

    const executionHistory = template.executionHistory || [];

    if (executionHistory.length === 0) {
      historyBody.innerHTML = `
        <div class="history-empty" style="padding: 20px; text-align: center; color: #6c757d;">
          No executions yet
        </div>
      `;
      return;
    }

    // Sort by most recent first
    const sortedHistory = [...executionHistory].sort((a, b) => b.executedAt - a.executedAt);

    // Render history rows
    historyBody.innerHTML = sortedHistory
      .map((execution) => {
        const date = new Date(execution.executedAt);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();

        const statusClass = execution.status === 'success' ? 'status-success' : 'status-failed';
        const statusText = execution.status === 'success' ? 'Success' : 'Failed';

        return `
        <div class="history-row">
          <div class="col-datetime">${dateStr} ${timeStr}</div>
          <div class="col-status">
            <span class="${statusClass}">${statusText}</span>
          </div>
          <div class="col-expense">
            ${
              execution.expenseId
                ? `<a href="#" class="expense-link" data-expense-id="${execution.expenseId}" style="color: #007bff; cursor: pointer; text-decoration: underline;">${execution.expenseId}</a>`
                : execution.error || 'N/A'
            }
          </div>
        </div>
      `;
      })
      .join('');

    // Add click handlers to expense links with a small delay to ensure DOM is updated
    setTimeout(() => {
      historyBody.querySelectorAll('.expense-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const expenseId = link.getAttribute('data-expense-id');
          if (expenseId) {
            // Use void to handle the async operation
            void (async () => {
              // First, ensure we have the expense in our state
              if (!this.state.expenses.find((exp) => exp.id === expenseId)) {
                // Fetch expenses if we don't have this one
                await this.handleFetchExpenses();
              }
              // Show the expense detail
              void this.showExpenseDetail(expenseId);
            })();
          }
        });
      });
    }, 100); // Small delay to ensure DOM is updated
  }

  private toggleTemplateEdit(): void {
    const detailContent = document.getElementById('templateDetailContent');
    const editForm = document.getElementById('templateEditForm');
    const detailActions = document.getElementById('templateDetailActions');
    const editToggle = document.getElementById('toggleTemplateEdit');

    if (!detailContent || !editForm) return;

    const isEditing = editForm.style.display !== 'none';

    if (isEditing) {
      // Switch to view mode
      detailContent.style.display = 'block';
      editForm.style.display = 'none';
      if (detailActions) detailActions.style.display = 'flex';
      if (editToggle) editToggle.textContent = 'Edit';
    } else {
      // Switch to edit mode
      detailContent.style.display = 'none';
      editForm.style.display = 'block';
      if (detailActions) detailActions.style.display = 'none';
      if (editToggle) editToggle.textContent = 'Cancel';

      // Populate form with current values
      this.populateTemplateEditForm();
    }
  }

  private populateTemplateEditForm(): void {
    if (!this.state.currentTemplate) return;

    const template = this.state.currentTemplate;

    // Set form values
    const nameInput = document.getElementById('templateName') as HTMLInputElement;
    const merchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
    const amountInput = document.getElementById('templateAmount') as HTMLInputElement;
    const currencySelect = document.getElementById('templateCurrency') as HTMLSelectElement;
    const descriptionInput = document.getElementById('templateDescription') as HTMLTextAreaElement;

    if (nameInput) nameInput.value = template.name;
    if (merchantInput) merchantInput.value = template.expenseData.merchant?.name || '';
    if (amountInput) amountInput.value = String(template.expenseData.merchantAmount || '');
    if (currencySelect) currencySelect.value = template.expenseData.merchantCurrency || 'USD';
    if (descriptionInput) descriptionInput.value = template.expenseData.details?.description || '';

    // Set scheduling if enabled
    const enableScheduling = document.getElementById('enableScheduling') as HTMLInputElement;
    if (enableScheduling && template.scheduling) {
      enableScheduling.checked = template.scheduling.enabled;
      this.handleSchedulingToggle();

      // Set scheduling values
      if (template.scheduling.enabled) {
        // Set frequency
        const frequencyRadio = document.querySelector(
          `input[name="frequency"][value="${template.scheduling.interval}"]`
        ) as HTMLInputElement;
        if (frequencyRadio) {
          frequencyRadio.checked = true;
          this.handleFrequencyChange();
        }

        // Set execution time
        if (template.scheduling.executionTime) {
          const hourSelect = document.getElementById('hour') as HTMLSelectElement;
          const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
          const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;

          if (hourSelect && minuteSelect && ampmSelect) {
            // Convert 24-hour to 12-hour format
            let hour = template.scheduling.executionTime.hour;
            let ampm = 'AM';

            if (hour === 0) {
              hour = 12;
            } else if (hour === 12) {
              ampm = 'PM';
            } else if (hour > 12) {
              hour -= 12;
              ampm = 'PM';
            }

            hourSelect.value = String(hour);
            minuteSelect.value = String(template.scheduling.executionTime.minute);
            ampmSelect.value = ampm;
          }
        }

        // Set custom interval if applicable
        if (
          template.scheduling.interval === 'custom' &&
          template.scheduling.intervalConfig?.customIntervalMs
        ) {
          const customIntervalSelect = document.getElementById(
            'customInterval'
          ) as HTMLSelectElement;
          if (customIntervalSelect) {
            // Convert milliseconds to minutes
            const intervalMinutes = template.scheduling.intervalConfig.customIntervalMs / 60000;
            customIntervalSelect.value = String(intervalMinutes);
          }
        }

        // Update preview after setting all values
        this.updateSchedulingPreview();
      }
    }
  }

  private cancelTemplateEdit(): void {
    this.toggleTemplateEdit();
  }

  private async handleSaveTemplate(): Promise<void> {
    if (!this.state.currentTemplate) return;

    const nameInput = document.getElementById('templateName') as HTMLInputElement;
    const merchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
    const amountInput = document.getElementById('templateAmount') as HTMLInputElement;
    const currencySelect = document.getElementById('templateCurrency') as HTMLSelectElement;
    const descriptionInput = document.getElementById('templateDescription') as HTMLTextAreaElement;

    // Build scheduling object if scheduling is enabled
    let scheduling: TemplateScheduling | null = null;
    const enableScheduling = document.getElementById('enableScheduling') as HTMLInputElement;
    if (enableScheduling?.checked) {
      const frequency = document.querySelector(
        'input[name="frequency"]:checked'
      ) as HTMLInputElement;
      const hourSelect = document.getElementById('hour') as HTMLSelectElement;
      const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
      const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;

      if (frequency && hourSelect && minuteSelect && ampmSelect) {
        const hour = parseInt(hourSelect.value);
        const minute = parseInt(minuteSelect.value);
        const ampm = ampmSelect.value;

        // Convert to 24-hour format
        let hour24 = hour;
        if (ampm === 'PM' && hour !== 12) hour24 += 12;
        if (ampm === 'AM' && hour === 12) hour24 = 0;

        scheduling = {
          enabled: true,
          paused: false,
          interval: frequency.value as 'daily' | 'weekly' | 'monthly' | 'custom',
          executionTime: {
            hour: hour24,
            minute,
          },
          intervalConfig: {},
        };

        // Add interval-specific config
        switch (frequency.value) {
          case 'weekly':
            const checkedDays = Array.from(
              document.querySelectorAll('.weekly-settings input[type="checkbox"]:checked')
            ).map((cb) => (cb as HTMLInputElement).value);
            scheduling.intervalConfig.daysOfWeek = checkedDays;
            break;

          case 'monthly':
            const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
            if (dayOfMonthSelect) {
              const dayValue = dayOfMonthSelect.value;
              scheduling.intervalConfig.dayOfMonth =
                dayValue === 'last' ? 'last' : parseInt(dayValue);
            } else {
              // Default to first day of month if UI element not found
              scheduling.intervalConfig.dayOfMonth = 1;
              warn('dayOfMonth element not found, defaulting to 1');
            }
            break;

          case 'custom':
            const customIntervalSelect = document.getElementById(
              'customInterval'
            ) as HTMLSelectElement;
            if (customIntervalSelect) {
              const intervalMinutes = parseInt(customIntervalSelect.value);
              scheduling.intervalConfig.customIntervalMs = intervalMinutes * 60 * 1000;
            }
            break;
        }
      }
    }

    const updatedTemplate = {
      id: this.state.currentTemplate.id,
      name: nameInput?.value || this.state.currentTemplate.name,
      expenseData: {
        merchant: merchantInput?.value
          ? { name: merchantInput.value }
          : this.state.currentTemplate.expenseData.merchant,
        merchantAmount: amountInput?.value
          ? parseFloat(amountInput.value)
          : this.state.currentTemplate.expenseData.merchantAmount,
        merchantCurrency: currencySelect?.value || 'USD',
        details: {
          category: this.state.currentTemplate.expenseData.details?.category,
          description:
            descriptionInput?.value || this.state.currentTemplate.expenseData.details?.description,
        },
      },
      scheduling,
    };

    try {
      const response = await this.sendMessage({
        action: 'updateTemplate',
        template: updatedTemplate,
      });

      if (response.success) {
        // Update local state
        const index = this.state.templates.findIndex((t) => t.id === updatedTemplate.id);
        if (index !== -1) {
          this.state.templates[index] = { ...this.state.templates[index], ...updatedTemplate };
          this.state.currentTemplate = this.state.templates[index];
        }

        // If scheduling was updated, notify the service worker to update alarms
        if (scheduling !== undefined) {
          info('Notifying service worker to update scheduling for template:', updatedTemplate.id);
          await this.sendMessage({
            action: 'updateSchedule',
            templateId: updatedTemplate.id,
            schedule: scheduling
              ? {
                  enabled: true,
                  recurrence: scheduling.interval,
                  time: `${scheduling.executionTime.hour}:${scheduling.executionTime.minute}`,
                  weeklyDays:
                    scheduling.interval === 'weekly'
                      ? scheduling.intervalConfig.daysOfWeek?.map((day: string) =>
                          [
                            'sunday',
                            'monday',
                            'tuesday',
                            'wednesday',
                            'thursday',
                            'friday',
                            'saturday',
                          ].indexOf(day.toLowerCase())
                        )
                      : undefined,
                  monthlyDay:
                    scheduling.interval === 'monthly'
                      ? scheduling.intervalConfig.dayOfMonth === 'last'
                        ? -1
                        : scheduling.intervalConfig.dayOfMonth
                      : undefined,
                  customIntervalMs:
                    scheduling.interval === 'custom'
                      ? scheduling.intervalConfig.customIntervalMs
                      : undefined,
                }
              : {
                  enabled: false,
                },
          });
        }

        // Switch back to view mode
        this.toggleTemplateEdit();
        this.updateTemplateDetailView();

        // Show toast with scheduling info
        let message = 'Template saved successfully';
        if (scheduling?.enabled) {
          const scheduleInfo = this.getScheduleDescription(scheduling);
          message = `Template saved with scheduling: ${scheduleInfo}`;
        }

        this.showToast('Template Updated', message, 'success');
      } else {
        this.showToast(
          'Save Failed',
          (response.error as string) || 'Unable to save template changes',
          'error'
        );
      }
    } catch (err) {
      error('Failed to update template:', { error: err });
      this.showToast('Save Failed', 'Unable to save template changes', 'error');
    }
  }

  private async handleApplyTemplate(): Promise<void> {
    logger.debug('APPLY_TEMPLATE_START', {
      templateId: this.state.currentTemplate?.id,
      templateName: this.state.currentTemplate?.name,
      timestamp: Date.now(),
      isApplying: this.isApplyingTemplate,
    });

    // Prevent duplicate calls
    if (this.isApplyingTemplate) {
      logger.debug('APPLY_TEMPLATE_BLOCKED', {
        reason: 'Already applying template',
        timestamp: Date.now(),
      });
      return;
    }

    if (!this.state.currentTemplate) return;

    this.isApplyingTemplate = true;

    try {
      // Create expense from template
      const templateData = this.state.currentTemplate.expenseData;
      const originalAmount = templateData.merchantAmount || 0;
      const currency = templateData.merchantCurrency || 'USD';
      const merchantName = templateData.merchant?.name || 'Unknown';

      // Show amount modification modal
      showAmountModificationModal({
        originalAmount,
        currency,
        expenseName: merchantName,
        onConfirm: async (modifiedAmount: number) => {
          // Continue with expense creation using modified amount
          await this.createExpenseFromTemplate(this.state.currentTemplate!, modifiedAmount);
        },
        onCancel: () => {
          this.isApplyingTemplate = false;
          this.showToast('Cancelled', 'Expense creation cancelled', 'info');
        },
      });
    } catch (err) {
      this.isApplyingTemplate = false;
      error('Failed to apply template:', { error: err });
      this.showToast('Error', 'Failed to apply template', 'error');
    }
  }

  private async createExpenseFromTemplate(
    template: ExpenseTemplate,
    amount: number
  ): Promise<void> {
    // Show immediate feedback
    this.showToast('Creating Expense...', 'Applying template to create new expense', 'info');

    try {
      const templateData = template.expenseData;

      // Transform the expense data to ensure correct format
      const expenseData: ExpenseCreatePayload = {
        merchantAmount: amount, // Use the modified amount
        merchantCurrency: templateData.merchantCurrency || 'USD',
        date: new Date().toISOString().split('T')[0], // Today's date
        merchant: templateData.merchant || { name: 'Unknown' },
      };

      // Handle policy field - convert from old format if needed
      const templateDataWithPolicy = templateData as Partial<ExpenseCreatePayload> & {
        policy?: { id: string } | string;
      };
      if (
        templateDataWithPolicy.policy &&
        typeof templateDataWithPolicy.policy === 'object' &&
        'id' in templateDataWithPolicy.policy
      ) {
        // Old format: { id: string }
        expenseData.policyType = templateDataWithPolicy.policy.id;
      } else if (templateData.policyType) {
        // New format: string
        expenseData.policyType = templateData.policyType;
      } else if (
        templateDataWithPolicy.policy &&
        typeof templateDataWithPolicy.policy === 'string'
      ) {
        // Fallback: policy as string
        expenseData.policyType = templateDataWithPolicy.policy;
      }

      // Add optional fields if they exist
      if (templateData.details) {
        expenseData.details = templateData.details;
      }
      if (templateData.reportingData) {
        expenseData.reportingData = templateData.reportingData;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if this exact expense is already being processed
      const expenseKey = `${template.id}_${expenseData.date}`;
      if (pendingExpenseRequests.has(expenseKey)) {
        logger.debug('APPLY_TEMPLATE_DUPLICATE_BLOCKED', {
          templateId: template.id,
          expenseKey,
          timestamp: Date.now(),
        });
        this.showToast('Please Wait', 'Expense creation already in progress', 'info');
        this.isApplyingTemplate = false;
        return;
      }

      pendingExpenseRequests.add(expenseKey);

      logger.debug('APPLY_TEMPLATE_SENDING', {
        action: 'submitExpense',
        templateId: template.id,
        timestamp: Date.now(),
        requestId,
        expenseKey,
        expenseData,
      });

      const response = await this.sendMessage({
        action: 'createExpense',
        data: expenseData,
        requestId, // Add request ID to track duplicates
      });

      logger.debug('APPLY_TEMPLATE_RESPONSE', {
        success: response.success,
        error: response.error,
        timestamp: Date.now(),
      });

      if (response.success) {
        const responseData = response.data as Record<string, unknown>;
        const expenseId = String(responseData?.id || responseData?.uuid || 'unknown');

        // Update template usage
        await this.sendMessage({
          action: 'updateTemplateUsage',
          templateId: template.id,
        });

        // Update template with execution history
        {
          // Update template with execution history
          const executionEntry = {
            id: `exec_${Date.now()}`,
            executedAt: Date.now(),
            status: 'success' as const,
            expenseId,
            metadata: { executionType: 'manual' },
          };

          // Send update to persist the execution history
          await this.sendMessage({
            action: 'updateTemplate',
            template: {
              id: template.id,
              name: template.name,
              expenseData: template.expenseData,
              scheduling: template.scheduling,
              executionHistory: [...(template.executionHistory || []), executionEntry],
            },
          });

          // Update local state for immediate UI feedback
          template.executionHistory = [...(template.executionHistory || []), executionEntry];

          // Re-render if we're viewing this template
          if (this.state.currentTemplate?.id === template.id) {
            this.renderExecutionHistory(template);
          }
        }

        this.showToast('Expense Created', 'Successfully created expense from template', 'success');

        // Show receipt upload modal
        if (expenseId && expenseId !== 'unknown') {
          const merchantName = template.expenseData.merchant?.name || 'Unknown';

          showReceiptUploadModal({
            expenseId,
            expenseName: merchantName,
            sendMessage: this.sendMessage.bind(this),
            onUploadComplete: async (receiptUrl: string) => {
              info('Receipt uploaded successfully:', { expenseId, receiptUrl });
              this.showToast('Receipt Uploaded', 'Receipt attached to expense', 'success');

              // Refresh expenses list to show the updated expense with receipt
              await this.handleFetchExpenses();

              // Show the expense detail
              await this.showExpenseDetail(expenseId);
            },
            onSkip: () => {
              info('Receipt upload skipped for expense:', { expenseId });

              // Open in Navan web UI
              const navanUrl = `https://app.navan.com/app/liquid/user/transactions/details-new/${expenseId}`;
              window.open(navanUrl, '_blank', 'noopener,noreferrer');

              // Also show in the extension's detail view
              void this.showExpenseDetail(expenseId);
            },
          });
        } else {
          // If no expense ID, just refresh the list
          await this.handleFetchExpenses();
        }
      } else {
        this.showToast(
          'Creation Failed',
          (response.error as string) || 'Unable to create expense from template',
          'error'
        );
      }
    } catch (err) {
      error('Failed to apply template:', { error: err });
      logger.debug('APPLY_TEMPLATE_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      });
    } finally {
      // Always reset the flag and remove from pending requests
      this.isApplyingTemplate = false;
      const expenseKey = `${template.id}_${new Date().toISOString().split('T')[0]}`;
      pendingExpenseRequests.delete(expenseKey);

      logger.debug('APPLY_TEMPLATE_COMPLETE', {
        timestamp: Date.now(),
        expenseKey,
      });
    }
  }

  private async handleDuplicateTemplate(): Promise<void> {
    if (!this.state.currentTemplate) return;

    const newName = prompt(
      'Enter name for the duplicate template:',
      `${this.state.currentTemplate.name} (Copy)`
    );
    if (!newName) return;

    try {
      const response = await this.sendMessage({
        action: 'createTemplate',
        template: {
          name: newName,
          expenseData: this.state.currentTemplate.expenseData,
        },
      });

      if (response.success) {
        await this.fetchTemplates();
        this.showTemplateList();
        this.showToast('Template Duplicated', `Created copy: ${newName}`, 'success');
      } else {
        this.showToast(
          'Duplication Failed',
          (response.error as string) || 'Unable to duplicate template',
          'error'
        );
      }
    } catch (err) {
      error('Failed to duplicate template:', { error: err });
      this.showToast(
        'Duplication Failed',
        'An error occurred while duplicating the template',
        'error'
      );
    }
  }

  private async handleDeleteTemplate(): Promise<void> {
    if (!this.state.currentTemplate) return;

    const confirmed = confirm(
      `Are you sure you want to delete the template "${this.state.currentTemplate.name}"?`
    );
    if (!confirmed) return;

    try {
      const response = await this.sendMessage({
        action: 'deleteTemplate',
        templateId: this.state.currentTemplate.id,
      });

      if (response.success) {
        // Remove the deleted template from local state immediately
        const deletedTemplateId = this.state.currentTemplate.id;
        this.state.templates = this.state.templates.filter((t) => t.id !== deletedTemplateId);

        // Clear current template since it was deleted
        this.state.currentTemplate = null;

        // Re-render the templates list immediately with the updated state
        this.renderTemplates();

        // Update the template count
        const templatesStatus = document.getElementById('templatesStatus');
        if (templatesStatus) {
          templatesStatus.textContent = `${this.state.templates.length} template(s) available`;
          templatesStatus.className = 'templates-status success';
        }

        // Show the template list view (not the detail view)
        this.showTemplateList();

        // Show success toast
        this.showToast('Template Deleted', 'Template has been deleted successfully', 'success');

        // Fetch templates from storage to ensure consistency (but UI is already updated)
        await this.fetchTemplates();
      } else {
        this.showToast(
          'Deletion Failed',
          (response.error as string) || 'Unable to delete template',
          'error'
        );
      }
    } catch (err) {
      error('Failed to delete template:', { error: err });
      this.showToast('Deletion Failed', 'An error occurred while deleting the template', 'error');
    }
  }

  private async handleDuplicateExpense(): Promise<void> {
    if (!this.state.currentExpense) return;

    try {
      info('Starting expense duplication workflow');

      // Start the duplication workflow
      await duplicationWorkflow.start(this.state.currentExpense, {
        onComplete: async (expenseData, submitAsComplete, receiptFile) => {
          // Show loading modal
          const loadingModal = loading({
            title: submitAsComplete ? 'Submitting Expense' : 'Saving Draft',
            message: 'Creating expense...',
            showProgress: true,
          });

          try {
            // Update progress
            loadingModal.updateProgress(10);

            // Create the expense payload
            const payload = submitAsComplete ? expenseData : { ...expenseData, isDraft: true };

            // Create the expense
            loadingModal.updateMessage('Creating expense...');
            loadingModal.updateProgress(30);

            const response = await this.sendMessage({
              action: 'createExpense',
              data: payload,
            });

            if (response.success) {
              loadingModal.updateProgress(60);
              const responseData = response.data as Record<string, unknown>;
              const responseExpense = (response as { expense?: Record<string, unknown> })?.expense;
              // Try multiple possible ID fields
              const expenseId = String(
                responseData?.id ||
                  responseData?.uuid ||
                  responseData?.expenseId ||
                  responseExpense?.id ||
                  responseExpense?.uuid ||
                  'unknown'
              );

              info('Expense created successfully:', {
                expenseId,
                responseData,
                responseExpense,
                status: (responseData as Record<string, unknown>)?.status,
                isDraft: !submitAsComplete,
              });

              // Upload receipt if provided
              let receiptUploaded = false;
              if (receiptFile && expenseId && expenseId !== 'unknown') {
                try {
                  loadingModal.updateMessage('Uploading receipt...');
                  loadingModal.updateProgress(70);

                  info('Uploading receipt for duplicated expense', {
                    expenseId,
                    fileName: receiptFile.name,
                    fileSize: receiptFile.size,
                    fileType: receiptFile.type,
                  });

                  const uploadResponse = await this.uploadReceipt(expenseId, receiptFile);
                  info('Receipt upload response:', uploadResponse);

                  if (uploadResponse.success) {
                    info('Receipt uploaded successfully');
                    receiptUploaded = true;
                    loadingModal.updateProgress(90);
                    loadingModal.updateMessage('Receipt uploaded successfully!');
                  } else {
                    warn('Receipt upload failed but expense was created', {
                      error: uploadResponse.error,
                    });
                    loadingModal.updateProgress(90);
                    loadingModal.updateMessage('Expense created (receipt upload failed)');
                  }
                } catch (err) {
                  error('Failed to upload receipt:', { error: err });
                  loadingModal.updateProgress(90);
                  loadingModal.updateMessage('Expense created (receipt upload failed)');
                  // Don't fail the whole operation if receipt upload fails
                }
              } else {
                info('Receipt upload skipped', {
                  hasReceiptFile: !!receiptFile,
                  expenseId,
                  isValidExpenseId: expenseId !== 'unknown',
                });
                loadingModal.updateProgress(90);
              }

              // Show success message
              const title = submitAsComplete ? 'Expense Submitted' : 'Draft Saved';
              let message = submitAsComplete
                ? 'Successfully created and submitted expense for approval'
                : 'Expense saved as draft. You can submit it later from Navan.';

              if (receiptUploaded) {
                message += ' Receipt attached successfully.';
              } else if (receiptFile) {
                message += ' (Receipt upload failed - please attach manually in Navan)';
              }

              // Complete the loading
              loadingModal.updateProgress(100);
              loadingModal.updateMessage('Complete!');

              // Close loading modal after brief delay
              setTimeout(() => {
                loadingModal.close();
                this.showToast(title, message, 'success');
              }, 500);

              // Refresh expenses list
              await this.handleFetchExpenses();

              // Open the newly created expense
              if (expenseId && expenseId !== 'unknown') {
                const navanUrl = `https://app.navan.com/app/liquid/user/transactions/details-new/${expenseId}`;
                window.open(navanUrl, '_blank', 'noopener,noreferrer');
                await this.showExpenseDetail(expenseId);
              }
            } else {
              throw new Error(String(response.error || 'Failed to create expense'));
            }
          } catch (err) {
            // Close loading modal on error
            loadingModal.close();

            error('Failed to create expense:', { error: err });
            this.showToast(
              'Creation Failed',
              'Failed to create expense. Please try again.',
              'error'
            );
          }
        },
        onCancel: () => {
          info('User cancelled expense duplication workflow');
        },
        onError: (err) => {
          error('Workflow error:', { error: err });
          this.showToast(
            'Error',
            'An error occurred during duplication. Please try again.',
            'error'
          );
        },
      });
    } catch (err) {
      error('Failed to start duplication workflow:', { error: err });
      this.showToast('Error', 'Failed to duplicate expense. Please try again.', 'error');
    }
  }

  private async uploadReceipt(
    expenseId: string,
    file: File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      info('Starting receipt upload', {
        expenseId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Convert file to base64 using FileReader API (most reliable method)
      let base64Data: string;
      try {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (typeof reader.result === 'string') {
              // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            } else {
              reject(new Error('Failed to read file as base64'));
            }
          };

          reader.onerror = () => {
            reject(new Error(`FileReader error: ${reader.error?.message}`));
          };

          reader.readAsDataURL(file);
        });
      } catch (err) {
        error('Failed to encode file to base64:', { error: err, fileSize: file.size });
        throw new Error(
          `Failed to encode file: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      info('Sending attach receipt message', {
        expenseId,
        filename: file.name,
        dataLength: base64Data.length,
        mimeType: file.type,
        size: file.size,
      });

      const response = await this.sendMessage({
        action: 'attachReceipt',
        payload: {
          expenseId,
          filename: file.name,
          data: base64Data,
          mimeType: file.type,
          size: file.size,
          isBase64: true,
        },
      });

      info('Attach receipt response received:', response);

      return response as { success: boolean; error?: string };
    } catch (err) {
      error('Failed to upload receipt:', { error: err });
      return { success: false, error: String(err) };
    }
  }

  private handleSaveAsTemplate(): void {
    if (!this.state.currentExpense) return;

    const dialog = document.getElementById('templateCreationDialog');
    const preview = document.getElementById('templatePreview');
    const nameInput = document.getElementById('newTemplateName') as HTMLInputElement;

    if (dialog) dialog.style.display = 'block';

    if (preview) {
      preview.innerHTML = `
        <h4>Expense Details</h4>
        <div class="detail-field">
          <span class="detail-label">Merchant</span>
          <span class="detail-value">${this.state.currentExpense.merchant.name}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${this.state.currentExpense.merchantCurrency} ${this.state.currentExpense.merchantAmount}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">Category</span>
          <span class="detail-value">${this.state.currentExpense.merchant.categoryGroup || 'Uncategorized'}</span>
        </div>
      `;
    }

    if (nameInput) {
      nameInput.value = '';
      nameInput.focus();
    }
  }

  private closeTemplateDialog(): void {
    const dialog = document.getElementById('templateCreationDialog');
    if (dialog) dialog.style.display = 'none';
  }

  private async handleCreateTemplate(): Promise<void> {
    info('handleCreateTemplate called');

    if (!this.state.currentExpense) {
      error('No current expense in state');
      return;
    }

    const nameInput = document.getElementById('newTemplateName') as HTMLInputElement;
    if (!nameInput || !nameInput.value.trim()) {
      info('Template name is empty');
      const errorEl = document.getElementById('newTemplateNameError');
      if (errorEl) {
        errorEl.textContent = 'Template name is required';
        errorEl.style.display = 'block';
      }
      return;
    }

    try {
      // Use the helper to create properly structured ExpenseCreatePayload
      const expenseData = searchTransactionToCreatePayload(this.state.currentExpense);

      info('Sending createTemplate message with data:', {
        name: nameInput.value.trim(),
        expenseData,
      });

      const response = await this.sendMessage({
        action: 'createTemplate',
        template: {
          name: nameInput.value.trim(),
          expenseData,
        },
      });

      info('Create template response:', response);

      if (response.success) {
        this.closeTemplateDialog();
        await this.fetchTemplates();
        this.showToast(
          'Template Created',
          `Successfully created template: ${nameInput.value.trim()}`,
          'success'
        );
      } else {
        error('Create template failed:', response.error);
        const errorEl = document.getElementById('newTemplateNameError');
        if (errorEl) {
          errorEl.textContent = (response.error as string) || 'Failed to create template';
          errorEl.style.display = 'block';
        }
      }
    } catch (err) {
      error('Failed to create template:', { error: err });
      const errorEl = document.getElementById('newTemplateNameError');
      if (errorEl) {
        errorEl.textContent = 'An error occurred while creating the template';
        errorEl.style.display = 'block';
      }
    }
  }

  private handleTemplateAction(templateId: string, action: string | null): void {
    if (!action) return;

    const template = this.state.templates.find((t) => t.id === templateId);
    if (!template) return;

    this.state.currentTemplate = template;

    switch (action) {
      case 'edit':
        void this.showTemplateDetail(templateId);
        this.toggleTemplateEdit();
        break;
      case 'duplicate':
        void this.handleDuplicateTemplate();
        break;
      case 'delete':
        void this.handleDeleteTemplate();
        break;
      case 'apply':
        logger.debug('TEMPLATE_ACTION_APPLY', {
          templateId,
          timestamp: Date.now(),
        });
        // Don't open detail view, just apply directly
        void this.handleApplyTemplate();
        break;
    }
  }

  private handleSchedulingToggle(): void {
    const enableScheduling = document.getElementById('enableScheduling') as HTMLInputElement;
    const schedulingConfig = document.getElementById('schedulingConfig');

    if (schedulingConfig) {
      schedulingConfig.style.display = enableScheduling?.checked ? 'block' : 'none';

      // Update preview when scheduling is toggled on
      if (enableScheduling?.checked) {
        this.updateSchedulingPreview();
      }
    }
  }

  private handleFrequencyChange(): void {
    const selectedFrequency = document.querySelector(
      'input[name="frequency"]:checked'
    ) as HTMLInputElement;

    // Hide all frequency-specific settings
    document.querySelector('.weekly-settings')?.setAttribute('style', 'display: none;');
    document.querySelector('.monthly-settings')?.setAttribute('style', 'display: none;');
    document.querySelector('.custom-settings')?.setAttribute('style', 'display: none;');

    // Show relevant settings
    if (selectedFrequency) {
      switch (selectedFrequency.value) {
        case 'weekly':
          document.querySelector('.weekly-settings')?.setAttribute('style', 'display: block;');
          break;
        case 'monthly':
          document.querySelector('.monthly-settings')?.setAttribute('style', 'display: block;');
          break;
        case 'custom':
          document.querySelector('.custom-settings')?.setAttribute('style', 'display: block;');
          break;
      }
    }

    this.updateSchedulingPreview();
  }

  private updateSchedulingPreview(): void {
    const preview = document.getElementById('nextExecutionPreview');
    if (!preview) return;

    const frequency = document.querySelector('input[name="frequency"]:checked') as HTMLInputElement;
    if (!frequency) {
      preview.textContent = '-';
      return;
    }

    try {
      // Get time inputs
      const hourSelect = document.getElementById('hour') as HTMLSelectElement;
      const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
      const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;

      if (!hourSelect || !minuteSelect || !ampmSelect) {
        preview.textContent = 'Time inputs not found';
        return;
      }

      const hour = parseInt(hourSelect.value);
      const minute = parseInt(minuteSelect.value);
      const ampm = ampmSelect.value;

      // Convert to 24-hour format
      let hour24 = hour;
      if (ampm === 'PM' && hour !== 12) hour24 += 12;
      if (ampm === 'AM' && hour === 12) hour24 = 0;

      // Build scheduling object based on current form values
      const scheduling: TemplateScheduling = {
        enabled: true,
        paused: false,
        interval: frequency.value as 'daily' | 'weekly' | 'monthly' | 'custom',
        executionTime: {
          hour: hour24,
          minute,
        },
        intervalConfig: {},
      };

      // Add interval-specific config
      switch (frequency.value) {
        case 'weekly':
          const checkedDays = Array.from(
            document.querySelectorAll('.weekly-settings input[type="checkbox"]:checked')
          ).map((cb) => (cb as HTMLInputElement).value);
          if (checkedDays.length === 0) {
            preview.textContent = 'Select at least one day';
            return;
          }
          scheduling.intervalConfig.daysOfWeek = checkedDays;
          break;

        case 'monthly':
          const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
          if (dayOfMonthSelect) {
            const dayValue = dayOfMonthSelect.value;
            scheduling.intervalConfig.dayOfMonth =
              dayValue === 'last' ? 'last' : parseInt(dayValue);
          } else {
            // Default to first day of month if UI element not found
            scheduling.intervalConfig.dayOfMonth = 1;
          }
          break;

        case 'custom':
          const customIntervalSelect = document.getElementById(
            'customInterval'
          ) as HTMLSelectElement;
          if (customIntervalSelect) {
            const intervalMinutes = parseInt(customIntervalSelect.value);
            scheduling.intervalConfig.customIntervalMs = intervalMinutes * 60 * 1000;

            // For custom intervals, use the scheduled start time as the base
            const now = new Date();
            const scheduledStart = new Date();
            scheduledStart.setHours(hour24, minute, 0, 0);

            // If we haven't reached the start time yet, that's the next execution
            if (scheduledStart > now) {
              scheduling.startDate = scheduledStart.getTime();
            } else {
              // We're past the start time, so use it as the start date for interval calculation
              scheduling.startDate = scheduledStart.getTime();
            }
          }
          break;
      }

      // Calculate next execution
      const nextTime = this.scheduleCalculator.calculateNext(scheduling);

      if (nextTime) {
        const nextDate = new Date(nextTime);
        const now = new Date();

        // Format the time
        const timeStr = nextDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        // Calculate relative time
        const diffMs = nextTime - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        let relativeStr = '';
        if (diffDays > 0) {
          relativeStr = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          relativeStr = `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
          relativeStr = `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        } else {
          relativeStr = 'now';
        }

        // Show both absolute and relative time
        preview.textContent = `${timeStr} (${relativeStr})`;
      } else {
        preview.textContent = 'Unable to calculate';
      }
    } catch (err) {
      error('Error calculating next execution:', { error: err });
      preview.textContent = 'Error calculating time';
    }
  }

  private async handlePauseSchedule(): Promise<void> {
    if (!this.state.currentTemplate) return;

    try {
      const response = await this.sendMessage({
        action: 'pauseSchedule',
        templateId: this.state.currentTemplate.id,
      });

      if (response.success) {
        const pauseBtn = document.getElementById('pauseSchedule');
        const resumeBtn = document.getElementById('resumeSchedule');

        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'inline-block';
      }
    } catch (err) {
      error('Failed to pause schedule:', { error: err });
    }
  }

  private async handleResumeSchedule(): Promise<void> {
    if (!this.state.currentTemplate) return;

    try {
      const response = await this.sendMessage({
        action: 'resumeSchedule',
        templateId: this.state.currentTemplate.id,
      });

      if (response.success) {
        const pauseBtn = document.getElementById('pauseSchedule');
        const resumeBtn = document.getElementById('resumeSchedule');

        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        if (resumeBtn) resumeBtn.style.display = 'none';
      }
    } catch (err) {
      error('Failed to resume schedule:', { error: err });
    }
  }

  private handleSortChange(): void {
    // Re-render with new sort order
    this.renderExpenses();
  }

  private handlePaginationChange(): void {
    // Re-render with new page size
    this.renderExpenses();
  }

  private handleFilterChange(): void {
    // Re-render with new filters
    this.renderExpenses();
  }

  private handleClearFilters(): void {
    const merchantCategory = document.getElementById('merchantCategory') as HTMLSelectElement;
    const expenseStatus = document.getElementById('expenseStatus') as HTMLSelectElement;

    if (merchantCategory) merchantCategory.value = '';
    if (expenseStatus) expenseStatus.value = '';

    // Re-render without filters
    this.renderExpenses();
  }

  private setLoading(loading: boolean): void {
    this.state.isLoading = loading;
  }

  private initializeCollapsibleSections(): void {
    // Expand expenses section by default
    const expensesContent = document.getElementById('expensesContent');
    const expensesToggle = document.getElementById('expensesToggle');

    if (expensesContent) expensesContent.style.display = 'block';
    if (expensesToggle) expensesToggle.classList.add('expanded');

    // Keep templates section expanded
    const templatesContent = document.getElementById('templatesContent');
    const templatesToggle = document.getElementById('templatesToggle');

    if (templatesContent) templatesContent.style.display = 'block';
    if (templatesToggle) templatesToggle.classList.add('expanded');
  }

  private async loadInitialData(): Promise<void> {
    info('SidepanelUI: Loading initial data...');

    try {
      // Load templates on startup
      await this.fetchTemplates();
      info('SidepanelUI: Initial templates loaded');

      // Load search settings
      await this.loadSearchSettings();

      // Check if auto-fetch is enabled
      const result = await chrome.storage.local.get('autoFetchExpenses');
      const isAutoFetchEnabled = result.autoFetchExpenses !== false; // Default to true

      if (isAutoFetchEnabled) {
        info('SidepanelUI: Auto-fetch is enabled, fetching expenses...');

        // Expand expenses section
        const expensesContent = document.getElementById('expensesContent');
        const expensesToggle = document.getElementById('expensesToggle');
        if (expensesContent) expensesContent.style.display = 'block';
        if (expensesToggle) expensesToggle.classList.add('expanded');

        // Show loading state immediately
        const status = document.getElementById('expensesStatus');
        if (status) {
          status.innerHTML = '<span class="loading-spinner"></span>Loading expenses...';
          status.className = 'expenses-status';
        }

        // Fetch expenses automatically
        await this.handleFetchExpenses();
      }
    } catch (err) {
      error('SidepanelUI: Failed to load initial data:', { error: err });
      // Don't throw - we want the UI to still work even if templates fail to load
    }
  }

  private async loadSearchSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('expenseSearchEnabled');
      const isSearchEnabled = result.expenseSearchEnabled !== false; // Default to true

      // Show/hide search based on setting
      const searchSection = document.getElementById('expenseSearch');
      if (searchSection && this.state.expenses.length > 0) {
        searchSection.style.display = isSearchEnabled ? 'block' : 'none';
      }
    } catch (err) {
      error('Failed to load search settings:', { error: err });
    }
  }

  private async initializeDarkMode(): Promise<void> {
    try {
      // Load dark mode preference from Chrome storage
      const result = await chrome.storage.local.get('darkMode');
      const isDarkMode = result.darkMode === true;

      // Apply dark mode if enabled
      if (isDarkMode) {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('darkModeToggle') as HTMLInputElement;
        if (toggle) {
          toggle.checked = true;
        }
      }

      // Add event listener for dark mode toggle
      const darkModeToggle = document.getElementById('darkModeToggle') as HTMLInputElement;
      if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => void this.toggleDarkMode());
      }
    } catch (err) {
      error('Failed to initialize dark mode:', { error: err });
    }
  }

  private async toggleDarkMode(): Promise<void> {
    const isDarkMode = document.body.classList.toggle('dark-mode');

    try {
      // Save preference to Chrome storage
      await chrome.storage.local.set({ darkMode: isDarkMode });
      info('Dark mode preference saved:', isDarkMode);
    } catch (err) {
      error('Failed to save dark mode preference:', { error: err });
    }
  }

  private injectHelpContent(): void {
    const helpContentDiv = document.getElementById('helpContent');
    if (helpContentDiv) {
      const builder = new HelpContentBuilder();
      helpContentDiv.innerHTML = builder.build(HELP_CONTENT);
      logger.debug('Help content injected successfully');
    } else {
      logger.warn('Help content container not found');
    }
  }

  private showToast(
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    duration: number = 4000
  ): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">×</button>
    `;

    // Add click handler to close button
    const closeBtn = toast.querySelector('.toast-close') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      });
    }

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  private async debugScheduling(): Promise<void> {
    // Debug function to check active alarms
    try {
      const alarms = await chrome.alarms.getAll();
      info('Active alarms:', alarms);

      // Check templates with scheduling
      const response = await this.sendMessage({ action: 'getTemplates' });
      if (response.success && response.templates) {
        const scheduledTemplates = (response.templates as ExpenseTemplate[]).filter(
          (t: ExpenseTemplate) => t.scheduling?.enabled
        );
        info('Templates with scheduling:', scheduledTemplates);

        scheduledTemplates.forEach((t: ExpenseTemplate) => {
          info(`Template "${t.name}" scheduled:`, {
            interval: t.scheduling?.interval,
            nextExecution: t.scheduling?.nextExecution
              ? new Date(t.scheduling.nextExecution).toLocaleString()
              : 'Not set',
            executionTime: t.scheduling?.executionTime,
            intervalConfig: t.scheduling?.intervalConfig,
          });
        });
      }
    } catch (err) {
      error('Debug scheduling error:', { error: err });
    }
  }

  private getScheduleDescription(scheduling: TemplateScheduling): string {
    if (!scheduling.enabled) return 'Not scheduled';

    // Convert hour to 12-hour format for display
    let displayHour = scheduling.executionTime.hour;
    let ampm = 'AM';

    if (displayHour === 0) {
      displayHour = 12;
    } else if (displayHour === 12) {
      ampm = 'PM';
    } else if (displayHour > 12) {
      displayHour -= 12;
      ampm = 'PM';
    }

    const time = `${displayHour}:${String(scheduling.executionTime.minute).padStart(2, '0')} ${ampm}`;

    switch (scheduling.interval) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days =
          scheduling.intervalConfig.daysOfWeek
            ?.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1))
            .join(', ') || 'No days';
        return `Weekly on ${days} at ${time}`;
      case 'monthly':
        const day = scheduling.intervalConfig.dayOfMonth;
        const dayStr = day === 'last' ? 'last day' : `day ${day}`;
        return `Monthly on ${dayStr} at ${time}`;
      case 'custom':
        const minutes = (scheduling.intervalConfig.customIntervalMs || 0) / 60000;
        return `Every ${minutes} minutes starting at ${time}`;
      default:
        return scheduling.interval;
    }
  }

  private showFieldSettings(): void {
    // Check if modal already exists and remove it
    const existingModal = document.getElementById('fieldSettingsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'fieldSettingsModal';
    modal.className = 'field-settings-modal';
    modal.innerHTML = `
      <div class="field-settings-modal-content">
        <div id="fieldSettingsContainer"></div>
      </div>
    `;

    // Add modal styles if not already present
    if (!document.getElementById('modal-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-styles';
      style.textContent = `
        .field-settings-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(0, 0, 0, 0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999 !important;
        }

        .field-settings-modal-content {
          background: white !important;
          border-radius: 8px !important;
          width: 90% !important;
          max-width: 900px !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Append modal to body
    document.body.appendChild(modal);

    // Initialize field settings component
    const container = document.getElementById('fieldSettingsContainer');
    if (container) {
      try {
        const fieldSettings = new FieldSettings(container, {
          onSave: (_config) => {
            // Close modal
            modal.remove();

            // Refresh the current expense detail view
            if (this.state.currentExpense) {
              void this.showExpenseDetail(this.state.currentExpense.id);
            }

            this.showToast('Settings Saved', 'Field preferences have been updated', 'success');
          },
          onCancel: () => {
            // Close modal
            modal.remove();
          },
        });

        // Render the settings UI
        void fieldSettings.render();
      } catch {
        modal.remove();
        this.showToast('Error', 'Failed to open field settings', 'error');
      }
    }

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}
