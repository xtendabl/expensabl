import { AttachReceiptPayload } from '../../../../features/messaging/types';

interface ExpenseDetailWithReceiptProps {
  expenseId: string;
  existingReceipts?: Array<{ key: string; url?: string; thumbnail?: string; pageCount?: number }>;
  onReceiptUpload?: (receiptKey: string) => void;
  onReceiptDelete?: (receiptKey: string) => void;
  onError?: (error: string) => void;
}

export class ExpenseDetailWithReceipt {
  private container: HTMLElement;
  private props: ExpenseDetailWithReceiptProps;
  private isUploading = false;
  private selectedFile: File | null = null;
  private fileInput: HTMLInputElement | null = null;

  constructor(container: HTMLElement, props: ExpenseDetailWithReceiptProps) {
    this.container = container;
    this.props = props;
  }

  render(): void {
    // Create receipt section
    const receiptSection = document.createElement('div');
    receiptSection.className = 'receipt-section';
    receiptSection.innerHTML = `
      <div class="receipt-header">
        <h3>Receipts</h3>
        <button id="addReceiptBtn" class="btn btn-secondary btn-sm">
          <span class="icon">📎</span> Add Receipt
        </button>
      </div>
      <div id="receiptList" class="receipt-list">
        ${this.renderExistingReceipts()}
      </div>
      <div id="receiptUploadArea" class="receipt-upload-area" style="display: none;">
        <div id="fileUploadContainer" class="file-upload-container">
          <div id="dropZone" class="drop-zone">
            <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
            <div class="drop-zone-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p><span class="text-primary">Click to upload</span> or drag and drop</p>
              <p class="text-secondary">PDF, JPG, PNG (max 10MB)</p>
            </div>
            <div id="selectedFileInfo" class="selected-file-info" style="display: none;">
              <span id="selectedFileName"></span>
              <button id="removeFileBtn" class="btn-remove-file">×</button>
            </div>
          </div>
        </div>
        <div class="receipt-upload-actions">
          <button id="uploadReceiptBtn" class="btn btn-primary" disabled>Upload</button>
          <button id="cancelUploadBtn" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
      <div id="uploadStatus" class="upload-status" style="display: none;"></div>
    `;

    // Add styles
    this.addStyles();

    // Append to container
    this.container.appendChild(receiptSection);

    // Store file input reference
    this.fileInput = this.container.querySelector('#fileInput') as HTMLInputElement;

    // Attach event listeners
    this.attachEventListeners();
  }

  private renderExistingReceipts(): string {
    if (!this.props.existingReceipts || this.props.existingReceipts.length === 0) {
      return '<div class="no-receipts">No receipts attached</div>';
    }

    return this.props.existingReceipts
      .map((receipt, index) => {
        // Use a generic document icon since Navan combines all receipts into a single document
        const fileIcon = '<span class="file-type-badge doc">DOC</span>';

        return `
      <div class="receipt-item" data-receipt-key="${receipt.key}">
        <div class="receipt-thumbnail document">
          ${fileIcon}
        </div>
        <div class="receipt-info">
          <span class="receipt-name">Receipt${receipt.pageCount && receipt.pageCount > 1 ? ` (${receipt.pageCount} pages)` : ''}</span>
          <div class="receipt-actions">
            <button class="receipt-view" data-key="${receipt.key}" title="View receipt">👁️</button>
            <button class="receipt-delete" data-key="${receipt.key}" title="Delete receipt">🗑️</button>
          </div>
        </div>
      </div>
    `;
      })
      .join('');
  }

  private attachEventListeners(): void {
    // Add receipt button
    const addBtn = this.container.querySelector('#addReceiptBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showUploadArea());
    }

    // Cancel upload button
    const cancelBtn = this.container.querySelector('#cancelUploadBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideUploadArea());
    }

    // Upload button
    const uploadBtn = this.container.querySelector('#uploadReceiptBtn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.handleUpload());
    }

    // File input change
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Drop zone click
    const dropZone = this.container.querySelector('#dropZone');
    if (dropZone) {
      dropZone.addEventListener('click', (e) => {
        // Don't trigger if clicking the remove button
        if ((e.target as HTMLElement).id !== 'removeFileBtn') {
          this.fileInput?.click();
        }
      });

      // Drag and drop events
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const dragEvent = e as DragEvent;
        const files = dragEvent.dataTransfer?.files;
        if (files && files.length > 0) {
          this.handleDroppedFile(files[0]);
        }
      });
    }

    // Remove file button
    const removeBtn = this.container.querySelector('#removeFileBtn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearSelectedFile();
      });
    }

    // View receipt buttons
    const viewButtons = this.container.querySelectorAll('.receipt-view');
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const receiptKey = (btn as HTMLElement).getAttribute('data-key');
        if (receiptKey) {
          void this.handleViewReceipt(receiptKey);
        }
      });
    });

    // Delete receipt buttons
    const deleteButtons = this.container.querySelectorAll('.receipt-delete');
    deleteButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const receiptKey = (btn as HTMLElement).getAttribute('data-key');
        if (receiptKey) {
          this.handleDeleteReceipt(receiptKey);
        }
      });
    });
  }

  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.validateAndSetFile(file);
    }
  }

  private handleDroppedFile(file: File): void {
    this.validateAndSetFile(file);
  }

  private validateAndSetFile(file: File): void {
    // Check file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      this.showStatus('Invalid file type. Please upload PDF, JPG, or PNG files.', 'error');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showStatus(
        `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`,
        'error'
      );
      return;
    }

    // Set the selected file
    this.selectedFile = file;
    this.displaySelectedFile(file);

    // Enable upload button
    const uploadBtn = this.container.querySelector('#uploadReceiptBtn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.disabled = false;
    }
  }

  private displaySelectedFile(file: File): void {
    const fileInfo = this.container.querySelector('#selectedFileInfo') as HTMLElement;
    const fileName = this.container.querySelector('#selectedFileName') as HTMLElement;
    const dropZoneContent = this.container.querySelector('.drop-zone-content') as HTMLElement;

    if (fileInfo && fileName && dropZoneContent) {
      fileName.textContent = file.name;
      fileInfo.style.display = 'flex';
      dropZoneContent.style.display = 'none';
    }
  }

  private clearSelectedFile(): void {
    this.selectedFile = null;

    // Clear file input
    if (this.fileInput) {
      this.fileInput.value = '';
    }

    // Hide file info, show drop zone content
    const fileInfo = this.container.querySelector('#selectedFileInfo') as HTMLElement;
    const dropZoneContent = this.container.querySelector('.drop-zone-content') as HTMLElement;

    if (fileInfo && dropZoneContent) {
      fileInfo.style.display = 'none';
      dropZoneContent.style.display = 'block';
    }

    // Disable upload button
    const uploadBtn = this.container.querySelector('#uploadReceiptBtn') as HTMLButtonElement;
    if (uploadBtn) {
      uploadBtn.disabled = true;
    }
  }

  private showUploadArea(): void {
    const uploadArea = this.container.querySelector('#receiptUploadArea') as HTMLElement;
    const addBtn = this.container.querySelector('#addReceiptBtn') as HTMLElement;

    if (uploadArea) {
      uploadArea.style.display = 'block';
    }

    if (addBtn) {
      addBtn.style.display = 'none';
    }
  }

  private hideUploadArea(): void {
    const uploadArea = this.container.querySelector('#receiptUploadArea') as HTMLElement;
    const addBtn = this.container.querySelector('#addReceiptBtn') as HTMLElement;

    if (uploadArea) {
      uploadArea.style.display = 'none';
    }

    if (addBtn) {
      addBtn.style.display = 'inline-flex';
    }

    // Clear selected file
    this.clearSelectedFile();

    // Clear status
    this.hideStatus();
  }

  private async handleUpload(): Promise<void> {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;

    // Show uploading state
    this.showStatus('Uploading receipt...', 'loading');

    // Disable buttons
    const uploadBtn = this.container.querySelector('#uploadReceiptBtn') as HTMLButtonElement;
    const cancelBtn = this.container.querySelector('#cancelUploadBtn') as HTMLButtonElement;
    if (uploadBtn) uploadBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      // Convert file to base64
      const arrayBuffer = await this.fileToArrayBuffer(this.selectedFile);
      const base64Data = await this.arrayBufferToBase64(arrayBuffer);

      // Prepare payload
      const payload: AttachReceiptPayload = {
        expenseId: this.props.expenseId,
        filename: this.selectedFile.name,
        mimeType: this.selectedFile.type,
        size: this.selectedFile.size,
        data: base64Data,
        isBase64: true,
      };

      // Send message to background
      const response = await chrome.runtime.sendMessage({
        action: 'attachReceipt',
        payload,
      });

      if (response?.success) {
        this.showStatus('Receipt uploaded successfully!', 'success');

        // Notify parent component
        if (this.props.onReceiptUpload && response.data?.receiptKey) {
          this.props.onReceiptUpload(response.data.receiptKey);
        }

        // Add receipt to list
        this.addReceiptToList(response.data);

        // Reset after delay
        setTimeout(() => {
          this.hideUploadArea();
          this.hideStatus();
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to upload receipt');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.showStatus(errorMessage, 'error');

      if (this.props.onError) {
        this.props.onError(errorMessage);
      }
    } finally {
      this.isUploading = false;

      // Re-enable buttons
      if (uploadBtn) uploadBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    if (!buffer) {
      throw new Error('ArrayBuffer is required');
    }

    if (buffer.byteLength === 0) {
      return '';
    }

    return new Promise((resolve, reject) => {
      try {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000; // Process in 32KB chunks to avoid stack overflow

        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }

        resolve(btoa(binary));
      } catch (error) {
        reject(
          new Error(
            `Failed to encode ArrayBuffer to base64: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  private addReceiptToList(receiptData: any): void {
    const receiptList = this.container.querySelector('#receiptList');
    if (!receiptList) return;

    // Remove "no receipts" message if present
    const noReceipts = receiptList.querySelector('.no-receipts');
    if (noReceipts) {
      noReceipts.remove();
    }

    // Add new receipt item with generic document icon
    const receiptItem = document.createElement('div');
    receiptItem.className = 'receipt-item';
    receiptItem.setAttribute('data-receipt-key', receiptData.receiptKey);
    receiptItem.innerHTML = `
      <div class="receipt-thumbnail document">
        <span class="file-type-badge doc">DOC</span>
      </div>
      <div class="receipt-info">
        <span class="receipt-name">Receipt</span>
        <div class="receipt-actions">
          <button class="receipt-view" data-key="${receiptData.receiptKey}" title="View receipt">👁️</button>
          <button class="receipt-delete" data-key="${receiptData.receiptKey}" title="Delete receipt">🗑️</button>
        </div>
      </div>
    `;

    // Add event listeners to the new buttons
    const viewBtn = receiptItem.querySelector('.receipt-view');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = (viewBtn as HTMLElement).getAttribute('data-key');
        if (key) {
          void this.handleViewReceipt(key);
        }
      });
    }

    const deleteBtn = receiptItem.querySelector('.receipt-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = (deleteBtn as HTMLElement).getAttribute('data-key');
        if (key) {
          this.handleDeleteReceipt(key);
        }
      });
    }

    receiptList.appendChild(receiptItem);
  }

  private showStatus(message: string, type: 'loading' | 'success' | 'error'): void {
    const statusElement = this.container.querySelector('#uploadStatus') as HTMLElement;
    if (!statusElement) return;

    statusElement.className = `upload-status upload-status--${type}`;
    statusElement.textContent = message;
    statusElement.style.display = 'block';
  }

  private hideStatus(): void {
    const statusElement = this.container.querySelector('#uploadStatus') as HTMLElement;
    if (statusElement) {
      statusElement.style.display = 'none';
    }
  }

  private async handleViewReceipt(receiptKey: string): Promise<void> {
    try {
      // Send message to background script to get receipt URL
      const response = await chrome.runtime.sendMessage({
        action: 'getReceiptUrl',
        payload: { receiptKey },
      });

      if (response?.success && response?.data?.url) {
        // Open the receipt URL in a new tab
        window.open(response.data.url, '_blank');
      } else {
        throw new Error(response?.error || 'Failed to get receipt URL');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      this.showStatus('Failed to view receipt', 'error');
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  private async handleDeleteReceipt(receiptKey: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this receipt?')) {
      return;
    }

    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'deleteReceipt',
        payload: {
          expenseId: this.props.expenseId,
          receiptKey,
        },
      });

      if (response?.success) {
        // Remove from UI
        const receiptItem = this.container.querySelector(
          `.receipt-item[data-receipt-key="${receiptKey}"]`
        );
        if (receiptItem) {
          receiptItem.remove();
        }

        // Check if no receipts left
        const receiptList = this.container.querySelector('#receiptList');
        const remainingReceipts = receiptList?.querySelectorAll('.receipt-item');
        if (receiptList && (!remainingReceipts || remainingReceipts.length === 0)) {
          receiptList.innerHTML = '<div class="no-receipts">No receipts attached</div>';
        }

        // Notify parent component
        if (this.props.onReceiptDelete) {
          this.props.onReceiptDelete(receiptKey);
        }

        this.showStatus('Receipt deleted successfully', 'success');
        setTimeout(() => this.hideStatus(), 2000);
      } else {
        throw new Error(response?.error || 'Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      this.showStatus('Failed to delete receipt', 'error');
      setTimeout(() => this.hideStatus(), 3000);
    }
  }

  private addStyles(): void {
    if (document.getElementById('receipt-component-styles')) return;

    const style = document.createElement('style');
    style.id = 'receipt-component-styles';
    style.textContent = `
      .receipt-section {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
      }
      
      .receipt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .receipt-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      .receipt-list {
        display: grid;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .no-receipts {
        padding: 24px;
        text-align: center;
        color: #6b7280;
        background-color: #f9fafb;
        border-radius: 8px;
      }
      
      .receipt-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background-color: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }
      
      .receipt-thumbnail {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #e5e7eb;
        border-radius: 6px;
        flex-shrink: 0;
      }
      
      .receipt-thumbnail.document {
        background-color: #dbeafe;
      }
      
      .file-type-badge {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: #3b82f6;
        color: white;
      }
      
      .receipt-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      
      .receipt-name {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }
      
      .receipt-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      
      .receipt-actions button {
        padding: 4px 8px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .receipt-actions button:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
      }
      
      .receipt-upload-area {
        margin-top: 16px;
      }
      
      .file-upload-container {
        margin-bottom: 16px;
      }
      
      .drop-zone {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 32px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background-color: #f9fafb;
        position: relative;
      }
      
      .drop-zone:hover {
        border-color: #3b82f6;
        background-color: #eff6ff;
      }
      
      .drop-zone.drag-over {
        border-color: #3b82f6;
        background-color: #dbeafe;
      }
      
      .drop-zone-content svg {
        margin: 0 auto 16px;
        color: #6b7280;
      }
      
      .drop-zone-content p {
        margin: 8px 0;
        color: #374151;
      }
      
      .drop-zone-content .text-primary {
        font-weight: 600;
        color: #3b82f6;
      }
      
      .drop-zone-content .text-secondary {
        font-size: 14px;
        color: #6b7280;
      }
      
      .selected-file-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background-color: white;
        border-radius: 6px;
        border: 1px solid #d1d5db;
      }
      
      #selectedFileName {
        font-size: 14px;
        color: #374151;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .btn-remove-file {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .btn-remove-file:hover {
        color: #ef4444;
      }
      
      .receipt-upload-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .upload-status {
        margin-top: 16px;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .upload-status--loading {
        background-color: #dbeafe;
        color: #1e3a8a;
        border: 1px solid #bfdbfe;
      }
      
      .upload-status--success {
        background-color: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      
      .upload-status--error {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      
      .btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .btn-primary {
        background-color: #3b82f6;
        color: white;
      }
      
      .btn-primary:hover:not(:disabled) {
        background-color: #2563eb;
      }
      
      .btn-primary:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
      }
      
      .btn-secondary {
        background-color: #6b7280;
        color: white;
      }
      
      .btn-secondary:hover {
        background-color: #4b5563;
      }
      
      .btn-sm {
        padding: 6px 12px;
        font-size: 13px;
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}
