import { ExpenseTemplate } from '../../features/templates/types';
import { BaseComponent } from '../shared/components/base-component';

interface TemplateListProps {
  templates: ExpenseTemplate[];
  onSelectTemplate: (template: ExpenseTemplate) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (templateId: string) => void;
  selectedTemplateId?: string;
}

interface TemplateListState {
  searchQuery: string;
  filterScheduled: boolean;
}

/**
 * Component for displaying and managing a list of expense templates
 */
export class TemplateList extends BaseComponent<TemplateListProps, TemplateListState> {
  constructor(props: TemplateListProps) {
    super(props, {
      searchQuery: '',
      filterScheduled: false,
    });
  }

  render(): string {
    const filteredTemplates = this.getFilteredTemplates();

    return `
      <div class="template-list">
        <div class="template-list-header">
          <h2>Templates</h2>
          <button class="btn-primary" id="create-template-btn">
            <span class="icon">+</span> New Template
          </button>
        </div>
        
        <div class="template-filters">
          <input 
            type="search" 
            class="search-input" 
            id="template-search"
            placeholder="Search templates..." 
            value="${this.state.searchQuery}"
          />
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              id="filter-scheduled"
              ${this.state.filterScheduled ? 'checked' : ''}
            />
            Scheduled only
          </label>
        </div>
        
        <div class="template-list-content">
          ${filteredTemplates.length === 0 ? this.renderEmptyState() : ''}
          ${filteredTemplates.map((template) => this.renderTemplateItem(template)).join('')}
        </div>
      </div>
    `;
  }

  private renderEmptyState(): string {
    if (this.props.templates.length === 0) {
      return `
        <div class="empty-state">
          <p>No templates yet</p>
          <p class="text-muted">Create your first template to get started</p>
        </div>
      `;
    }

    return `
      <div class="empty-state">
        <p>No templates match your search</p>
      </div>
    `;
  }

  private renderTemplateItem(template: ExpenseTemplate): string {
    const isSelected = template.id === this.props.selectedTemplateId;
    const isScheduled = template.scheduling?.enabled && !template.scheduling.paused;

    return `
      <div class="template-item ${isSelected ? 'selected' : ''}" data-template-id="${template.id}">
        <div class="template-info">
          <h3 class="template-name">${this.escapeHtml(template.name)}</h3>
          <div class="template-meta">
            ${template.metadata?.favorite ? '<span class="icon favorite">★</span>' : ''}
            ${isScheduled ? '<span class="badge scheduled">Scheduled</span>' : ''}
            <span class="text-muted">Used ${template.metadata?.useCount || 0} times</span>
          </div>
          ${
            template.expenseData.details?.description
              ? `<p class="template-description">${this.escapeHtml(template.expenseData.details.description)}</p>`
              : ''
          }
        </div>
        <div class="template-actions">
          <button class="btn-icon delete-btn" data-template-id="${template.id}" title="Delete template">
            <span class="icon">🗑</span>
          </button>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Create template button
    this.addEventListener('#create-template-btn', 'click', () => {
      this.props.onCreateTemplate();
    });

    // Search input
    this.addEventListener('#template-search', 'input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ searchQuery: target.value });
    });

    // Filter checkbox
    this.addEventListener('#filter-scheduled', 'change', (e) => {
      const target = e.target as HTMLInputElement;
      this.setState({ filterScheduled: target.checked });
    });

    // Template item clicks
    this.querySelectorAll('.template-item').forEach((item) => {
      this.addEventListener(item, 'click', (e) => {
        const target = e.target as HTMLElement;

        // Skip if delete button was clicked
        if (target.closest('.delete-btn')) {
          return;
        }

        const templateId = item.getAttribute('data-template-id');
        if (templateId) {
          const template = this.props.templates.find((t) => t.id === templateId);
          if (template) {
            this.props.onSelectTemplate(template);
          }
        }
      });
    });

    // Delete buttons
    this.querySelectorAll('.delete-btn').forEach((btn) => {
      this.addEventListener(btn, 'click', (e) => {
        e.stopPropagation();
        const templateId = btn.getAttribute('data-template-id');
        if (templateId) {
          this.props.onDeleteTemplate(templateId);
        }
      });
    });
  }

  private getFilteredTemplates(): ExpenseTemplate[] {
    let templates = [...this.props.templates];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.expenseData.details?.description?.toLowerCase().includes(query) ||
          t.expenseData.merchant?.name.toLowerCase().includes(query)
      );
    }

    // Apply scheduled filter
    if (this.state.filterScheduled) {
      templates = templates.filter((t) => t.scheduling?.enabled && !t.scheduling.paused);
    }

    // Sort by last used, then by name
    return templates.sort((a, b) => {
      const aLastUsed = a.metadata?.lastUsed || 0;
      const bLastUsed = b.metadata?.lastUsed || 0;

      if (aLastUsed !== bLastUsed) {
        return bLastUsed - aLastUsed; // More recently used first
      }

      return a.name.localeCompare(b.name);
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
