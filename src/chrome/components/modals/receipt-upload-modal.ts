import { Modal } from './modal';
import { modalManager } from './modal-manager';
import { LoadingModal, loading } from './modal-types';

export interface ReceiptUploadModalOptions {
  expenseId: string;
  expenseName?: string;
  onUploadComplete?: (receiptUrl: string) => void | Promise<void>;
  onSkip?: () => void;
  sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export class ReceiptUploadModal extends Modal {
  private expenseId: string;
  private sendMessage: (message: Record<string, unknown>) => Promise<Record<string, unknown>>;
  private onUploadComplete?: (receiptUrl: string) => void | Promise<void>;
  private onSkip?: () => void;
  private fileInput: HTMLInputElement;
  private dropZone: HTMLElement;
  private selectedFile: File | null = null;

  constructor(options: ReceiptUploadModalOptions) {
    const content = document.createElement('div');
    content.className = 'receipt-upload-modal-content';

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
        <h3>Add Receipt</h3>
        <p>${options.expenseName ? `Attach a receipt for "${options.expenseName}"` : 'Attach a receipt to your expense'}</p>
      </div>
      <div class="receipt-drop-zone" id="receipt-drop-zone">
        <div class="drop-zone-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <p class="drop-zone-text">Drag and drop your receipt here</p>
          <p class="drop-zone-subtext">or</p>
          <button type="button" class="select-file-button" id="select-file-btn">
            Browse Files
          </button>
          <p class="drop-zone-formats">Supports: JPG, PNG, PDF (Max 10MB)</p>
        </div>
      </div>
      <div class="receipt-preview" id="receipt-preview" style="display: none;">
        <div class="preview-content">
          <svg class="file-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          <div class="file-info">
            <span class="file-name" id="file-name"></span>
            <span class="file-size" id="file-size"></span>
          </div>
          <button type="button" class="remove-file-btn" id="remove-file">
            ✕
          </button>
        </div>
      </div>
      <div class="upload-status" id="upload-status" style="display: none;">
        <div class="status-message" id="status-message"></div>
      </div>
    `;

    content.appendChild(fileInput);

    super({
      title: 'Upload Receipt',
      content,
      className: 'receipt-upload-modal',
      closable: true,
      closeOnBackdrop: false,
      closeOnEsc: true,
      buttons: [
        {
          text: 'Skip',
          className: 'modal-button-secondary',
          onClick: () => {
            if (this.onSkip) {
              this.onSkip();
            }
          },
        },
        {
          text: 'Upload',
          className: 'modal-button-primary upload-btn',
          onClick: async () => {
            await this.handleUpload();
          },
          closeOnClick: false,
        },
      ],
      onClose: () => {
        if (this.onSkip) {
          this.onSkip();
        }
      },
    });

    this.expenseId = options.expenseId;
    this.sendMessage = options.sendMessage;
    this.onUploadComplete = options.onUploadComplete;
    this.onSkip = options.onSkip;
    this.fileInput = fileInput;
    this.dropZone = content.querySelector('#receipt-drop-zone') as HTMLElement;

    this.setupReceiptEventListeners();
  }

  private setupReceiptEventListeners(): void {
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.handleFileSelection(target.files[0]);
      }
    });

    // Browse button click
    const selectBtn = this.getElement().querySelector('#select-file-btn');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }

    // Drag and drop events
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.add('drag-over');
    });

    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        this.handleFileSelection(files[0]);
      }
    });

    // Remove file button
    const removeBtn = this.getElement().querySelector('#remove-file');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.clearFileSelection();
      });
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      this.showStatus('Invalid file type. Please select a JPG, PNG, or PDF file.', 'error');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showStatus('File is too large. Maximum size is 10MB.', 'error');
      return;
    }

    this.selectedFile = file;
    this.showFilePreview(file);
    this.enableUploadButton();
  }

  private showFilePreview(file: File): void {
    const preview = this.getElement().querySelector('#receipt-preview') as HTMLElement;
    const dropZone = this.getElement().querySelector('#receipt-drop-zone') as HTMLElement;
    const fileName = this.getElement().querySelector('#file-name') as HTMLElement;
    const fileSize = this.getElement().querySelector('#file-size') as HTMLElement;

    if (preview && dropZone && fileName && fileSize) {
      dropZone.style.display = 'none';
      preview.style.display = 'block';

      fileName.textContent = file.name;
      fileSize.textContent = this.formatFileSize(file.size);
    }
  }

  private clearFileSelection(): void {
    this.selectedFile = null;
    this.fileInput.value = '';

    const preview = this.getElement().querySelector('#receipt-preview') as HTMLElement;
    const dropZone = this.getElement().querySelector('#receipt-drop-zone') as HTMLElement;

    if (preview && dropZone) {
      preview.style.display = 'none';
      dropZone.style.display = 'block';
    }

    this.disableUploadButton();
    this.hideStatus();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private enableUploadButton(): void {
    const uploadBtn = this.getElement().querySelector('.upload-btn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  }

  private disableUploadButton(): void {
    const uploadBtn = this.getElement().querySelector('.upload-btn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.disabled = true;
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const statusDiv = this.getElement().querySelector('#upload-status') as HTMLElement;
    const statusMessage = this.getElement().querySelector('#status-message') as HTMLElement;

    if (statusDiv && statusMessage) {
      statusDiv.style.display = 'block';
      statusMessage.textContent = message;
      statusMessage.className = `status-message status-${type}`;
    }
  }

  private hideStatus(): void {
    const statusDiv = this.getElement().querySelector('#upload-status') as HTMLElement;
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  private async handleUpload(): Promise<void> {
    if (!this.selectedFile) {
      this.showStatus('Please select a file to upload', 'error');
      return;
    }

    // Show loading modal
    const loadingModal = loading({
      title: 'Uploading Receipt',
      message: 'Please wait while we upload your receipt...',
      showProgress: true,
    });

    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(this.selectedFile);

      // Update progress
      loadingModal.updateProgress(30);

      // Send upload request
      const response = await this.sendMessage({
        action: 'uploadReceipt',
        expenseId: this.expenseId,
        file: {
          data: base64,
          name: this.selectedFile.name,
          type: this.selectedFile.type,
          size: this.selectedFile.size,
        },
      });

      loadingModal.updateProgress(80);

      if (response.success) {
        loadingModal.updateProgress(100);
        loadingModal.updateMessage('Receipt uploaded successfully!');

        // Close loading modal after brief delay
        setTimeout(() => {
          loadingModal.close();
          this.close();

          if (this.onUploadComplete && response.receiptUrl) {
            this.onUploadComplete(response.receiptUrl as string);
          }
        }, 1000);
      } else {
        loadingModal.close();
        this.showStatus(
          (response.error as string) || 'Failed to upload receipt. Please try again.',
          'error'
        );
      }
    } catch (error) {
      loadingModal.close();
      this.showStatus('An error occurred while uploading. Please try again.', 'error');
      console.error('Receipt upload error:', error);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  open(): void {
    super.open();
    // Disable upload button initially
    this.disableUploadButton();
  }
}

export function showReceiptUploadModal(options: ReceiptUploadModalOptions): ReceiptUploadModal {
  const modal = new ReceiptUploadModal(options);
  modalManager.open(modal);
  return modal;
}
