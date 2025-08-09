import {
  FieldConfigurationService,
  ExpenseField,
  FieldConfiguration,
} from '../../features/expenses/services/field-configuration-service';

export interface FieldSettingsProps {
  onSave?: (config: FieldConfiguration) => void;
  onCancel?: () => void;
}

export class FieldSettings {
  private container: HTMLElement;
  private props: FieldSettingsProps;
  private selectedFields: string[] = [];
  private availableFields: ExpenseField[] = [];
  private draggedItem: HTMLElement | null = null;

  constructor(container: HTMLElement, props: FieldSettingsProps = {}) {
    this.container = container;
    this.props = props;
  }

  async render(): Promise<void> {
    // Load current configuration and available fields
    const config = await FieldConfigurationService.loadConfiguration();
    this.selectedFields = [...config.selectedFields];
    this.availableFields = FieldConfigurationService.getAvailableFields();

    // Create the settings UI
    this.container.innerHTML = `
      <div class="field-settings">
        <div class="field-settings-header">
          <h3>Customize Expense Fields</h3>
          <p>Select up to 8 fields to display in expense details. Drag to reorder.</p>
        </div>
        
        <div class="field-settings-content">
          <div class="field-column">
            <h4>Available Fields</h4>
            <div class="field-list available-fields" id="availableFields">
              ${this.renderAvailableFields()}
            </div>
          </div>
          
          <div class="field-column">
            <h4>Selected Fields (${this.selectedFields.length}/8)</h4>
            <div class="field-list selected-fields" id="selectedFields">
              ${this.renderSelectedFields()}
            </div>
          </div>
        </div>
        
        <div class="field-settings-footer">
          <button class="btn btn-secondary" id="cancelSettings">Cancel</button>
          <button class="btn btn-primary" id="saveSettings">Save Changes</button>
        </div>
      </div>
    `;

    // Add styles
    this.addStyles();

    // Attach event listeners
    this.attachEventListeners();
  }

  private renderAvailableFields(): string {
    return this.availableFields
      .filter((field) => !this.selectedFields.includes(field.id))
      .map(
        (field) => `
        <div class="field-item" data-field-id="${field.id}">
          <span class="field-label">${field.label}</span>
          <button class="field-add" title="Add field">+</button>
        </div>
      `
      )
      .join('');
  }

  private renderSelectedFields(): string {
    return this.selectedFields
      .map((fieldId, index) => {
        const field = this.availableFields.find((f) => f.id === fieldId);
        if (!field) return '';

        return `
          <div class="field-item selected" data-field-id="${field.id}" draggable="true" data-index="${index}">
            <span class="drag-handle">≡</span>
            <span class="field-label">${field.label}</span>
            <button class="field-remove" title="Remove field">×</button>
          </div>
        `;
      })
      .join('');
  }

  private attachEventListeners(): void {
    // Add field buttons
    this.container.querySelectorAll('.field-add').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const fieldItem = (e.target as HTMLElement).closest('.field-item');
        const fieldId = fieldItem?.getAttribute('data-field-id');
        if (fieldId) {
          this.addField(fieldId);
        }
      });
    });

    // Remove field buttons
    this.container.querySelectorAll('.field-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const fieldItem = (e.target as HTMLElement).closest('.field-item');
        const fieldId = fieldItem?.getAttribute('data-field-id');
        if (fieldId) {
          this.removeField(fieldId);
        }
      });
    });

    // Drag and drop for reordering
    this.initializeDragAndDrop();

    // Save button
    const saveBtn = this.container.querySelector('#saveSettings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // Cancel button
    const cancelBtn = this.container.querySelector('#cancelSettings');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.props.onCancel) {
          this.props.onCancel();
        }
      });
    }
  }

  private initializeDragAndDrop(): void {
    const selectedFieldsList = this.container.querySelector('#selectedFields');
    if (!selectedFieldsList) return;

    // Add drag event listeners to all selected field items
    selectedFieldsList.querySelectorAll('.field-item').forEach((item) => {
      const element = item as HTMLElement;

      element.addEventListener('dragstart', (e: DragEvent) => {
        this.draggedItem = element;
        element.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/html', element.innerHTML);
        }
      });

      element.addEventListener('dragend', () => {
        if (this.draggedItem) {
          this.draggedItem.classList.remove('dragging');
          this.draggedItem = null;
        }
      });
    });

    // Add drop zone events
    selectedFieldsList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragEvent = e as DragEvent;
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'move';
      }

      const afterElement = this.getDragAfterElement(
        selectedFieldsList as HTMLElement,
        dragEvent.clientY
      );
      if (this.draggedItem) {
        if (afterElement == null) {
          selectedFieldsList.appendChild(this.draggedItem);
        } else {
          selectedFieldsList.insertBefore(this.draggedItem, afterElement);
        }
      }
    });

    selectedFieldsList.addEventListener('drop', (e) => {
      e.preventDefault();
      this.updateSelectedFieldsOrder();
    });
  }

  private getDragAfterElement(container: HTMLElement, y: number): Element | null {
    const draggableElements = [...container.querySelectorAll('.field-item:not(.dragging)')];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > (closest as any).offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY, element: null } as any
    ).element;
  }

  private updateSelectedFieldsOrder(): void {
    const selectedFieldsList = this.container.querySelector('#selectedFields');
    if (!selectedFieldsList) return;

    const fieldItems = selectedFieldsList.querySelectorAll('.field-item');
    this.selectedFields = Array.from(fieldItems)
      .map((item) => item.getAttribute('data-field-id') || '')
      .filter((id) => id);
  }

  private addField(fieldId: string): void {
    if (this.selectedFields.length >= 8) {
      alert('You can select a maximum of 8 fields');
      return;
    }

    if (!this.selectedFields.includes(fieldId)) {
      this.selectedFields.push(fieldId);
      this.refreshLists();
    }
  }

  private removeField(fieldId: string): void {
    const index = this.selectedFields.indexOf(fieldId);
    if (index > -1) {
      this.selectedFields.splice(index, 1);
      this.refreshLists();
    }
  }

  private refreshLists(): void {
    const availableFieldsEl = this.container.querySelector('#availableFields');
    const selectedFieldsEl = this.container.querySelector('#selectedFields');
    const selectedCountEl = this.container.querySelector('.field-column h4:last-of-type');

    if (availableFieldsEl) {
      availableFieldsEl.innerHTML = this.renderAvailableFields();
    }

    if (selectedFieldsEl) {
      selectedFieldsEl.innerHTML = this.renderSelectedFields();
    }

    if (selectedCountEl) {
      selectedCountEl.textContent = `Selected Fields (${this.selectedFields.length}/8)`;
    }

    // Re-attach event listeners for the new elements
    this.attachEventListeners();
  }

  private async saveSettings(): Promise<void> {
    try {
      const config: FieldConfiguration = {
        selectedFields: this.selectedFields,
        maxFields: 8,
      };

      await FieldConfigurationService.saveConfiguration(config);

      if (this.props.onSave) {
        this.props.onSave(config);
      }
    } catch (error) {
      console.error('Failed to save field settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }

  private addStyles(): void {
    if (document.getElementById('field-settings-styles')) return;

    const style = document.createElement('style');
    style.id = 'field-settings-styles';
    style.textContent = `
      .field-settings {
        padding: 20px;
        background: white;
        border-radius: 8px;
        max-width: 800px;
        margin: 0 auto;
      }

      .field-settings-header {
        margin-bottom: 24px;
      }

      .field-settings-header h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      }

      .field-settings-header p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
      }

      .field-settings-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 24px;
      }

      .field-column h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .field-list {
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        min-height: 400px;
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }

      .field-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f9fafb;
        border-radius: 4px;
        margin-bottom: 6px;
        transition: all 0.2s;
      }

      .field-item:hover {
        background: #f3f4f6;
      }

      .field-item.selected {
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        cursor: move;
      }

      .field-item.dragging {
        opacity: 0.5;
      }

      .drag-handle {
        color: #9ca3af;
        margin-right: 8px;
        cursor: move;
      }

      .field-label {
        flex: 1;
        font-size: 14px;
      }

      .field-add,
      .field-remove {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .field-add {
        color: #10b981;
      }

      .field-add:hover {
        background: #d1fae5;
      }

      .field-remove {
        color: #ef4444;
      }

      .field-remove:hover {
        background: #fee2e2;
      }

      .field-settings-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
    `;
    document.head.appendChild(style);
  }
}
