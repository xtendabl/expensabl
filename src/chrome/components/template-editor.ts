import { ExpenseCreatePayload } from '../../features/expenses/types';
import { ExpenseTemplate, TemplateScheduling } from '../../features/templates/types';
import { BaseComponent } from '../shared/components/base-component';

interface TemplateEditorProps {
  template?: ExpenseTemplate;
  onSave: (template: Partial<ExpenseTemplate>) => void;
  onCancel: () => void;
}

interface TemplateEditorState {
  name: string;
  amount: string;
  currency: string;
  merchant: string;
  category: string;
  description: string;
  schedulingEnabled: boolean;
  interval: string;
  hour: string;
  minute: string;
  errors: Record<string, string>;
}

/**
 * Component for creating and editing expense templates
 */
export class TemplateEditor extends BaseComponent<TemplateEditorProps, TemplateEditorState> {
  constructor(props: TemplateEditorProps) {
    const template = props.template;

    super(props, {
      name: template?.name || '',
      amount: template?.expenseData.merchantAmount?.toString() || '',
      currency: template?.expenseData.merchantCurrency || 'USD',
      merchant: template?.expenseData.merchant?.name || '',
      category: template?.expenseData.details?.category || '',
      description: template?.expenseData.details?.description || '',
      schedulingEnabled: template?.scheduling?.enabled || false,
      interval: template?.scheduling?.interval || 'daily',
      hour: template?.scheduling?.executionTime?.hour?.toString() || '9',
      minute: template?.scheduling?.executionTime?.minute?.toString() || '0',
      errors: {},
    });
  }

  render(): string {
    const isEdit = !!this.props.template;
    const { errors } = this.state;

    return `
      <div class="template-editor">
        <div class="editor-header">
          <h2>${isEdit ? 'Edit Template' : 'Create Template'}</h2>
        </div>
        
        <form class="editor-form" id="template-form">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group ${errors.name ? 'error' : ''}">
              <label for="template-name">Template Name *</label>
              <input 
                type="text" 
                id="template-name" 
                class="form-control"
                value="${this.escapeHtml(this.state.name)}" 
                required
              />
              ${errors.name ? `<span class="error-message">${errors.name}</span>` : ''}
            </div>
          </div>
          
          <div class="form-section">
            <h3>Expense Details</h3>
            
            <div class="form-row">
              <div class="form-group ${errors.amount ? 'error' : ''}">
                <label for="template-amount">Amount *</label>
                <input 
                  type="number" 
                  id="template-amount" 
                  class="form-control"
                  value="${this.state.amount}" 
                  step="0.01"
                  min="0"
                  required
                />
                ${errors.amount ? `<span class="error-message">${errors.amount}</span>` : ''}
              </div>
              
              <div class="form-group">
                <label for="template-currency">Currency</label>
                <select id="template-currency" class="form-control">
                  <option value="USD" ${this.state.currency === 'USD' ? 'selected' : ''}>USD</option>
                  <option value="EUR" ${this.state.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                  <option value="GBP" ${this.state.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                  <option value="CAD" ${this.state.currency === 'CAD' ? 'selected' : ''}>CAD</option>
                </select>
              </div>
            </div>
            
            <div class="form-group ${errors.merchant ? 'error' : ''}">
              <label for="template-merchant">Merchant *</label>
              <input 
                type="text" 
                id="template-merchant" 
                class="form-control"
                value="${this.escapeHtml(this.state.merchant)}" 
                required
              />
              ${errors.merchant ? `<span class="error-message">${errors.merchant}</span>` : ''}
            </div>
            
            <div class="form-group">
              <label for="template-category">Category</label>
              <select id="template-category" class="form-control">
                <option value="">Select a category</option>
                <option value="travel" ${this.state.category === 'travel' ? 'selected' : ''}>Travel</option>
                <option value="meals" ${this.state.category === 'meals' ? 'selected' : ''}>Meals</option>
                <option value="supplies" ${this.state.category === 'supplies' ? 'selected' : ''}>Supplies</option>
                <option value="services" ${this.state.category === 'services' ? 'selected' : ''}>Services</option>
                <option value="other" ${this.state.category === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="template-description">Description</label>
              <textarea 
                id="template-description" 
                class="form-control"
                rows="3"
              >${this.escapeHtml(this.state.description)}</textarea>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Scheduling</h3>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  id="scheduling-enabled"
                  ${this.state.schedulingEnabled ? 'checked' : ''}
                />
                Enable automatic scheduling
              </label>
            </div>
            
            ${
              this.state.schedulingEnabled
                ? `
              <div class="scheduling-options">
                <div class="form-group">
                  <label for="template-interval">Frequency</label>
                  <select id="template-interval" class="form-control">
                    <option value="daily" ${this.state.interval === 'daily' ? 'selected' : ''}>Daily</option>
                    <option value="weekly" ${this.state.interval === 'weekly' ? 'selected' : ''}>Weekly</option>
                    <option value="monthly" ${this.state.interval === 'monthly' ? 'selected' : ''}>Monthly</option>
                  </select>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="template-hour">Time</label>
                    <div class="time-inputs">
                      <input 
                        type="number" 
                        id="template-hour" 
                        class="form-control time-input"
                        value="${this.state.hour}" 
                        min="0"
                        max="23"
                      />
                      <span>:</span>
                      <input 
                        type="number" 
                        id="template-minute" 
                        class="form-control time-input"
                        value="${this.state.minute.padStart(2, '0')}" 
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                </div>
              </div>
            `
                : ''
            }
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              ${isEdit ? 'Save Changes' : 'Create Template'}
            </button>
            <button type="button" class="btn-secondary cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Form submission
    this.addEventListener('#template-form', 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Cancel button
    this.addEventListener('.cancel-btn', 'click', () => {
      this.props.onCancel();
    });

    // Input changes
    this.addEventListener('#template-name', 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ name: target.value });
    });

    this.addEventListener('#template-amount', 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ amount: target.value });
    });

    this.addEventListener('#template-currency', 'change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.setState({ currency: target.value });
    });

    this.addEventListener('#template-merchant', 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ merchant: target.value });
    });

    this.addEventListener('#template-category', 'change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.setState({ category: target.value });
    });

    this.addEventListener('#template-description', 'input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.setState({ description: target.value });
    });

    this.addEventListener('#scheduling-enabled', 'change', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ schedulingEnabled: target.checked });
    });

    const intervalSelect = this.querySelector('#template-interval');
    if (intervalSelect) {
      this.addEventListener(intervalSelect, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.setState({ interval: target.value });
      });
    }

    const hourInput = this.querySelector('#template-hour');
    if (hourInput) {
      this.addEventListener(hourInput, 'input', (e) => {
        const target = e.target as HTMLInputElement;
        this.setState({ hour: target.value });
      });
    }

    const minuteInput = this.querySelector('#template-minute');
    if (minuteInput) {
      this.addEventListener(minuteInput, 'input', (e) => {
        const target = e.target as HTMLInputElement;
        this.setState({ minute: target.value });
      });
    }
  }

  private handleSubmit(): void {
    const errors = this.validate();

    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    const template: Partial<ExpenseTemplate> = {
      name: this.state.name,
      expenseData: this.buildExpenseData(),
      scheduling: this.state.schedulingEnabled ? this.buildScheduling() : null,
      updatedAt: Date.now(),
    };

    if (this.props.template) {
      template.id = this.props.template.id;
      template.version = this.props.template.version;
    } else {
      template.createdAt = Date.now();
      template.version = '1.0';
      template.metadata = {
        createdFrom: 'manual',
        tags: [],
        favorite: false,
        useCount: 0,
        scheduledUseCount: 0,
      };
      template.executionHistory = [];
    }

    this.props.onSave(template);
  }

  private validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!this.state.name.trim()) {
      errors.name = 'Template name is required';
    }

    const parsedAmount = parseFloat(this.state.amount);
    if (!this.state.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!this.state.merchant.trim()) {
      errors.merchant = 'Merchant is required';
    }

    return errors;
  }

  private buildExpenseData(): ExpenseCreatePayload {
    return {
      merchantAmount: parseFloat(this.state.amount),
      merchantCurrency: this.state.currency,
      date: new Date().toISOString().split('T')[0],
      merchant: { name: this.state.merchant },
      details: {
        category: this.state.category || undefined,
        description: this.state.description || undefined,
      },
    };
  }

  private buildScheduling(): TemplateScheduling {
    const intervalConfig: any = {};

    // Add interval-specific configuration
    switch (this.state.interval) {
      case 'weekly':
        // Default to Monday if no days are selected
        intervalConfig.daysOfWeek = ['monday'];
        break;
      case 'monthly':
        // Default to first day of month
        intervalConfig.dayOfMonth = 1;
        break;
      case 'custom':
        // Default to 5 minutes (minimum allowed)
        intervalConfig.customIntervalMs = 5 * 60 * 1000;
        break;
    }

    return {
      enabled: true,
      paused: false,
      interval: this.state.interval as 'daily' | 'weekly' | 'monthly',
      executionTime: {
        hour: parseInt(this.state.hour, 10),
        minute: parseInt(this.state.minute, 10),
      },
      intervalConfig,
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
