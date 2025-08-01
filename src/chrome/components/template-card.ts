import { ExpenseTemplate } from '../../features/templates/types';
import { BaseComponent } from '../shared/components/base-component';

interface TemplateCardProps {
  template: ExpenseTemplate;
  onEdit: (template: ExpenseTemplate) => void;
  onDelete: (templateId: string) => void;
  onToggleFavorite: (templateId: string) => void;
  onToggleScheduling: (templateId: string) => void;
  onUseTemplate: (template: ExpenseTemplate) => void;
}

interface TemplateCardState {
  isExpanded: boolean;
}

/**
 * Component for displaying detailed template information in a card format
 */
export class TemplateCard extends BaseComponent<TemplateCardProps, TemplateCardState> {
  constructor(props: TemplateCardProps) {
    super(props, {
      isExpanded: false,
    });
  }

  render(): string {
    const { template } = this.props;
    const isScheduled = template.scheduling?.enabled && !template.scheduling.paused;
    const nextExecution = template.scheduling?.nextExecution;

    return `
      <div class="template-card ${this.state.isExpanded ? 'expanded' : ''}">
        <div class="template-card-header">
          <div class="template-card-title">
            <h3>${this.escapeHtml(template.name)}</h3>
            <button 
              class="btn-icon favorite-btn ${template.metadata?.favorite ? 'active' : ''}" 
              title="${template.metadata?.favorite ? 'Remove from favorites' : 'Add to favorites'}"
            >
              <span class="icon">${template.metadata?.favorite ? '★' : '☆'}</span>
            </button>
          </div>
          <button class="btn-icon expand-btn" title="${this.state.isExpanded ? 'Collapse' : 'Expand'}">
            <span class="icon">${this.state.isExpanded ? '▼' : '▶'}</span>
          </button>
        </div>
        
        <div class="template-card-body">
          <div class="template-info">
            <div class="info-row">
              <span class="label">Amount:</span>
              <span class="value">${template.expenseData.merchantAmount} ${template.expenseData.merchantCurrency}</span>
            </div>
            <div class="info-row">
              <span class="label">Merchant:</span>
              <span class="value">${this.escapeHtml(template.expenseData.merchant?.name || 'N/A')}</span>
            </div>
            ${
              template.expenseData.details?.description
                ? `
              <div class="info-row">
                <span class="label">Description:</span>
                <span class="value">${this.escapeHtml(template.expenseData.details.description)}</span>
              </div>
            `
                : ''
            }
            ${
              template.expenseData.details?.category
                ? `
              <div class="info-row">
                <span class="label">Category:</span>
                <span class="value">${this.escapeHtml(template.expenseData.details.category)}</span>
              </div>
            `
                : ''
            }
          </div>
          
          ${
            isScheduled
              ? `
            <div class="scheduling-info">
              <div class="scheduling-header">
                <span class="badge scheduled">Scheduled</span>
                <button class="btn-text toggle-scheduling-btn">Pause</button>
              </div>
              <div class="scheduling-details">
                <div class="info-row">
                  <span class="label">Frequency:</span>
                  <span class="value">${this.escapeHtml(template.scheduling!.interval)}</span>
                </div>
                <div class="info-row">
                  <span class="label">Time:</span>
                  <span class="value">${this.formatTime(template.scheduling!.executionTime)}</span>
                </div>
                ${
                  nextExecution
                    ? `
                  <div class="info-row">
                    <span class="label">Next run:</span>
                    <span class="value">${this.formatDate(nextExecution)}</span>
                  </div>
                `
                    : ''
                }
              </div>
            </div>
          `
              : template.scheduling
                ? `
            <div class="scheduling-info">
              <div class="scheduling-header">
                <span class="badge paused">Scheduled (Paused)</span>
                <button class="btn-text toggle-scheduling-btn">Resume</button>
              </div>
            </div>
          `
                : ''
          }
          
          ${this.state.isExpanded ? this.renderExpandedContent() : ''}
        </div>
        
        <div class="template-card-actions">
          <button class="btn-primary use-template-btn">Use Template</button>
          <button class="btn-secondary edit-btn">Edit</button>
          <button class="btn-text delete-btn">Delete</button>
        </div>
      </div>
    `;
  }

  private renderExpandedContent(): string {
    const { template } = this.props;
    const stats = this.calculateStats();

    return `
      <div class="expanded-content">
        <div class="template-stats">
          <h4>Usage Statistics</h4>
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-value">${template.metadata?.useCount || 0}</span>
              <span class="stat-label">Total Uses</span>
            </div>
            <div class="stat">
              <span class="stat-value">${template.metadata?.scheduledUseCount || 0}</span>
              <span class="stat-label">Scheduled Uses</span>
            </div>
            <div class="stat">
              <span class="stat-value">${stats.successRate}%</span>
              <span class="stat-label">Success Rate</span>
            </div>
            ${
              template.metadata?.lastUsed
                ? `
              <div class="stat">
                <span class="stat-value">${this.formatDate(template.metadata.lastUsed)}</span>
                <span class="stat-label">Last Used</span>
              </div>
            `
                : ''
            }
          </div>
        </div>
        
        ${
          template.executionHistory?.length
            ? `
          <div class="execution-history">
            <h4>Recent Executions</h4>
            <div class="history-list">
              ${template.executionHistory
                .slice(0, 5)
                .map(
                  (execution) => `
                <div class="history-item ${execution.status}">
                  <span class="history-date">${this.formatDate(execution.executedAt)}</span>
                  <span class="history-status">${execution.status}</span>
                  ${execution.error ? `<span class="history-error">${this.escapeHtml(execution.error)}</span>` : ''}
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }
        
        <div class="template-metadata">
          <h4>Template Details</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="label">Created:</span>
              <span class="value">${this.formatDate(template.createdAt)}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Updated:</span>
              <span class="value">${this.formatDate(template.updatedAt)}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Version:</span>
              <span class="value">${template.version}</span>
            </div>
            <div class="metadata-item">
              <span class="label">Source:</span>
              <span class="value">${template.metadata?.createdFrom || 'manual'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected attachEventListeners(): void {
    // Expand/collapse button
    this.addEventListener('.expand-btn', 'click', () => {
      this.setState({ isExpanded: !this.state.isExpanded });
    });

    // Favorite button
    this.addEventListener('.favorite-btn', 'click', () => {
      this.props.onToggleFavorite(this.props.template.id);
    });

    // Use template button
    this.addEventListener('.use-template-btn', 'click', () => {
      this.props.onUseTemplate(this.props.template);
    });

    // Edit button
    this.addEventListener('.edit-btn', 'click', () => {
      this.props.onEdit(this.props.template);
    });

    // Delete button
    this.addEventListener('.delete-btn', 'click', () => {
      if (confirm(`Are you sure you want to delete "${this.props.template.name}"?`)) {
        this.props.onDelete(this.props.template.id);
      }
    });

    // Toggle scheduling button
    const toggleBtn = this.querySelector('.toggle-scheduling-btn');
    if (toggleBtn) {
      this.addEventListener(toggleBtn, 'click', () => {
        this.props.onToggleScheduling(this.props.template.id);
      });
    }
  }

  private calculateStats(): { successRate: number } {
    const { template } = this.props;
    const history = template.executionHistory || [];

    if (history.length === 0) {
      return { successRate: 100 };
    }

    const successful = history.filter((h) => h.status === 'success').length;
    const successRate = Math.round((successful / history.length) * 100);

    return { successRate };
  }

  private formatTime(time: { hour: number; minute: number }): string {
    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Handle future dates
    if (diffMs < 0) {
      const futureDiffMs = Math.abs(diffMs);
      const futureDiffDays = Math.floor(futureDiffMs / (1000 * 60 * 60 * 24));

      if (futureDiffDays === 0) {
        const futureDiffHours = Math.floor(futureDiffMs / (1000 * 60 * 60));
        if (futureDiffHours === 0) {
          const futureDiffMinutes = Math.floor(futureDiffMs / (1000 * 60));
          return `in ${futureDiffMinutes} minute${futureDiffMinutes !== 1 ? 's' : ''}`;
        }
        return `in ${futureDiffHours} hour${futureDiffHours !== 1 ? 's' : ''}`;
      } else if (futureDiffDays === 1) {
        return 'Tomorrow';
      } else {
        return `in ${futureDiffDays} days`;
      }
    }

    // Handle past dates
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes === 0) {
          return 'Just now';
        }
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
