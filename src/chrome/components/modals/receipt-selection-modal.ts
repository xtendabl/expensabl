import { Modal } from './modal';
import { modalManager } from './modal-manager';

export interface ReceiptSelectionModalOptions {
  expenseName?: string;
  onSelect: (file: File) => void;
  onSkip?: () => void;
  onCancel?: () => void;
}

export class ReceiptSelectionModal extends Modal {
  private fileInput: HTMLInputElement;
  private dropZone: HTMLElement;
  private selectedFile: File | null = null;
  private addButton: HTMLButtonElement | null = null;
  private isSubmitting: boolean = false;
  private isClosedByX: boolean = false;

  constructor(options: ReceiptSelectionModalOptions) {
    const content = document.createElement('div');
    content.className = 'receipt-selection-modal-content';

    // Create file input (hidden)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'receipt-file-input';

    content.innerHTML = `
      <div class="receipt-upload-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      </div>
      <div class="receipt-upload-message">
        <h3>Add Receipt (Optional)</h3>
        <p>${options.expenseName ? `Attach a receipt for "${options.expenseName}"` : 'Attach a receipt to your duplicated expense'}</p>
      </div>
      <div class="receipt-drop-zone" id="receipt-drop-zone">
        <div class="drop-zone-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <polyline points="17 7 12 2 7 7"></polyline>
          </svg>
          <p class="drop-zone-text">Drag and drop your receipt here</p>
          <p class="drop-zone-subtext">or</p>
          <button type="button" class="browse-button">Browse Files</button>
          <p class="file-types">Supported: Images (JPG, PNG) and PDF</p>
        </div>
        <div class="selected-file" style="display: none;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div class="file-info">
            <p class="file-name"></p>
            <p class="file-size"></p>
          </div>
          <button type="button" class="remove-file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    content.appendChild(fileInput);

    super({
      title: 'Add Receipt',
      content,
      closeOnBackdrop: false,
      closable: true, // Keep the X button
      buttons: [
        {
          text: 'Skip',
          className: 'modal-button-secondary',
          onClick: () => {
            this.isSubmitting = true;
            // Call onSkip BEFORE closing to ensure it executes
            options.onSkip?.();
            this.close();
          },
        },
        {
          text: 'Add Receipt',
          className: 'modal-button-primary',
          onClick: () => {
            // Only proceed if a file is selected
            if (this.selectedFile) {
              const file = this.selectedFile;
              // Set flag to prevent onClose from calling onCancel
              this.isSubmitting = true;
              // Call onSelect BEFORE closing to ensure it executes
              options.onSelect(file);
              this.close();
            } else {
              // If no file selected, do nothing (button should be disabled anyway)
              console.warn('Add Receipt clicked but no file selected');
            }
          },
        },
      ],
      onClose: () => {
        // Only call onCancel if X button was clicked (not when submitting via buttons)
        if (!this.isSubmitting && this.isClosedByX) {
          console.log('[ReceiptModal] Calling onCancel because X button was clicked');
          options.onCancel?.();
        } else if (!this.isSubmitting) {
          console.log(
            '[ReceiptModal] Modal closed but not via X button or submit, not calling onCancel'
          );
        }
      },
    });

    this.fileInput = fileInput;
    this.dropZone = content.querySelector('#receipt-drop-zone') as HTMLElement;

    // Set up the add button and disable it initially
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.addButton = this.getElement().querySelector(
        '.modal-button-primary'
      ) as HTMLButtonElement;
      if (this.addButton) {
        this.addButton.disabled = true;
        console.log('Add Receipt button initially disabled');
      } else {
        console.error('Add Receipt button not found for disabling');
      }

      // Override the X button behavior
      const closeBtn = this.getElement().querySelector('.modal-close') as HTMLButtonElement;
      if (closeBtn) {
        // Remove the default onclick handler set by parent Modal class
        closeBtn.onclick = null;
        // Add our custom handler
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[ReceiptModal] X button clicked, setting isClosedByX flag');
          this.isClosedByX = true;
          this.close();
        });
      }
    });

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    const browseButton = this.dropZone.querySelector('.browse-button') as HTMLButtonElement;
    const removeButton = this.dropZone.querySelector('.remove-file') as HTMLButtonElement;

    // Browse button click
    browseButton.addEventListener('click', () => {
      this.fileInput.click();
    });

    // File input change
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (file) {
        this.handleFileSelection(file);
      }
    });

    // Remove file button
    removeButton.addEventListener('click', () => {
      this.clearSelection();
    });

    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');

      const file = e.dataTransfer?.files[0];
      if (file && this.validateFile(file)) {
        this.handleFileSelection(file);
      }
    });
  }

  private validateFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please select an image (JPG, PNG) or PDF file.');
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB.');
      return false;
    }

    return true;
  }

  private handleFileSelection(file: File): void {
    if (!this.validateFile(file)) {
      return;
    }

    this.selectedFile = file;

    // Update UI
    const dropContent = this.dropZone.querySelector('.drop-zone-content') as HTMLElement;
    const selectedFile = this.dropZone.querySelector('.selected-file') as HTMLElement;
    const fileName = selectedFile.querySelector('.file-name') as HTMLElement;
    const fileSize = selectedFile.querySelector('.file-size') as HTMLElement;

    dropContent.style.display = 'none';
    selectedFile.style.display = 'flex';

    fileName.textContent = file.name;
    fileSize.textContent = this.formatFileSize(file.size);

    // Enable the Add Receipt button
    if (this.addButton) {
      this.addButton.disabled = false;
      console.log('Add Receipt button enabled - file selected:', file.name);
    }
  }

  private clearSelection(): void {
    this.selectedFile = null;
    this.fileInput.value = '';

    // Update UI
    const dropContent = this.dropZone.querySelector('.drop-zone-content') as HTMLElement;
    const selectedFile = this.dropZone.querySelector('.selected-file') as HTMLElement;

    dropContent.style.display = 'flex';
    selectedFile.style.display = 'none';

    // Disable the Add Receipt button
    if (this.addButton) {
      this.addButton.disabled = true;
      console.log('Add Receipt button disabled - file cleared');
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export function showReceiptSelectionModal(options: ReceiptSelectionModalOptions): void {
  console.log('[showReceiptSelectionModal] Creating and opening receipt modal');
  const modal = new ReceiptSelectionModal(options);
  modalManager.open(modal);
  console.log('[showReceiptSelectionModal] Modal opened successfully');
}
