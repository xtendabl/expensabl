import { ReceiptUploadModal, showReceiptUploadModal } from '../receipt-upload-modal';
import { modalManager } from '../modal-manager';

describe('ReceiptUploadModal', () => {
  let modal: ReceiptUploadModal;
  let sendMessage: jest.Mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    modalManager.closeAll();
    sendMessage = jest.fn();
  });

  afterEach(() => {
    if (modal && modal.isModalOpen()) {
      modal.close();
    }
  });

  describe('initialization', () => {
    it('should create modal with correct title and content', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        expenseName: 'Team Lunch',
        sendMessage,
      });
      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-title')?.textContent).toBe('Upload Receipt');
      expect(element.querySelector('.receipt-upload-message h3')?.textContent).toBe('Add Receipt');
      expect(element.querySelector('.receipt-upload-message p')?.textContent).toContain(
        'Team Lunch'
      );
    });

    it('should show generic message when expense name not provided', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.receipt-upload-message p')?.textContent).toBe(
        'Attach a receipt to your expense'
      );
    });

    it('should have Skip and Upload buttons', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const buttons = modal.getElement().querySelectorAll('.modal-button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Skip');
      expect(buttons[1].textContent).toBe('Upload');
    });

    it('should disable upload button initially', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;
      expect(uploadBtn.disabled).toBe(true);
    });
  });

  describe('file selection', () => {
    it('should handle file selection via input', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });

      // Create a mock FileList
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fileInput.dispatchEvent(new Event('change'));

      // Check that preview is shown
      const preview = modal.getElement().querySelector('#receipt-preview') as HTMLElement;
      const dropZone = modal.getElement().querySelector('#receipt-drop-zone') as HTMLElement;
      expect(preview.style.display).toBe('block');
      expect(dropZone.style.display).toBe('none');

      // Check file info
      expect(modal.getElement().querySelector('#file-name')?.textContent).toBe('receipt.jpg');
    });

    it('should validate file type', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const file = new File(['test'], 'document.txt', { type: 'text/plain' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fileInput.dispatchEvent(new Event('change'));

      // Check error message
      const status = modal.getElement().querySelector('#status-message') as HTMLElement;
      expect(status.textContent).toContain('Invalid file type');

      // Preview should not be shown
      const preview = modal.getElement().querySelector('#receipt-preview') as HTMLElement;
      expect(preview.style.display).not.toBe('block');
    });

    it('should validate file size', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      // Create a file larger than 10MB
      const largeFile = new File([new Uint8Array(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fileInput.dispatchEvent(new Event('change'));

      // Check error message
      const status = modal.getElement().querySelector('#status-message') as HTMLElement;
      expect(status.textContent).toContain('too large');
    });

    it('should enable upload button when valid file is selected', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;

      const file = new File(['test'], 'receipt.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fileInput.dispatchEvent(new Event('change'));

      expect(uploadBtn.disabled).toBe(false);
    });
  });

  describe('drag and drop', () => {
    it('should add drag-over class on dragover', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const dropZone = modal.getElement().querySelector('#receipt-drop-zone') as HTMLElement;

      const dragEvent = new Event('dragover') as any;
      dragEvent.preventDefault = jest.fn();
      dragEvent.stopPropagation = jest.fn();

      dropZone.dispatchEvent(dragEvent);

      expect(dropZone.classList.contains('drag-over')).toBe(true);
    });

    it('should remove drag-over class on dragleave', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const dropZone = modal.getElement().querySelector('#receipt-drop-zone') as HTMLElement;
      dropZone.classList.add('drag-over');

      const dragEvent = new Event('dragleave') as any;
      dragEvent.preventDefault = jest.fn();
      dragEvent.stopPropagation = jest.fn();

      dropZone.dispatchEvent(dragEvent);

      expect(dropZone.classList.contains('drag-over')).toBe(false);
    });

    it('should handle file drop', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const dropZone = modal.getElement().querySelector('#receipt-drop-zone') as HTMLElement;
      const file = new File(['test'], 'receipt.png', { type: 'image/png' });

      const dropEvent = new Event('drop') as any;
      dropEvent.preventDefault = jest.fn();
      dropEvent.stopPropagation = jest.fn();
      dropEvent.dataTransfer = { files: [file] };

      dropZone.dispatchEvent(dropEvent);

      // Check that preview is shown
      const preview = modal.getElement().querySelector('#receipt-preview') as HTMLElement;
      expect(preview.style.display).toBe('block');
      expect(modal.getElement().querySelector('#file-name')?.textContent).toBe('receipt.png');
    });
  });

  describe('file removal', () => {
    it('should clear file selection when remove button clicked', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      // First select a file
      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change'));

      // Now remove it
      const removeBtn = modal.getElement().querySelector('#remove-file') as HTMLButtonElement;
      removeBtn.click();

      // Check that preview is hidden
      const preview = modal.getElement().querySelector('#receipt-preview') as HTMLElement;
      const dropZone = modal.getElement().querySelector('#receipt-drop-zone') as HTMLElement;
      expect(preview.style.display).toBe('none');
      expect(dropZone.style.display).toBe('block');

      // Upload button should be disabled again
      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;
      expect(uploadBtn.disabled).toBe(true);
    });
  });

  describe('upload functionality', () => {
    it('should upload file successfully', async () => {
      const onUploadComplete = jest.fn();
      sendMessage.mockResolvedValue({
        success: true,
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
        onUploadComplete,
      });
      modal.open();

      // Select a file
      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const file = new File(['test content'], 'receipt.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change'));

      // Click upload
      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;
      uploadBtn.click();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(sendMessage).toHaveBeenCalledWith({
        action: 'uploadReceipt',
        expenseId: 'exp123',
        file: expect.objectContaining({
          name: 'receipt.jpg',
          type: 'image/jpeg',
          size: 12,
          data: expect.any(String),
        }),
      });

      expect(onUploadComplete).toHaveBeenCalledWith('https://example.com/receipt.jpg');
    });

    it('should handle upload failure', async () => {
      sendMessage.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      // Select a file
      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change'));

      // Click upload
      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;
      uploadBtn.click();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = modal.getElement().querySelector('#status-message') as HTMLElement;
      expect(status.textContent).toBe('Upload failed');
      expect(status.classList.contains('status-error')).toBe(true);
    });

    it('should show error when no file selected', async () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      // Try to upload without selecting a file
      const uploadBtn = modal.getElement().querySelector('.upload-btn') as HTMLButtonElement;
      uploadBtn.disabled = false; // Force enable for test
      uploadBtn.click();

      await new Promise((resolve) => process.nextTick(resolve));

      const status = modal.getElement().querySelector('#status-message') as HTMLElement;
      expect(status.textContent).toBe('Please select a file to upload');
    });
  });

  describe('skip functionality', () => {
    it('should call onSkip when Skip button clicked', () => {
      const onSkip = jest.fn();

      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
        onSkip,
      });
      modal.open();

      const skipBtn = modal.getElement().querySelectorAll('.modal-button')[0] as HTMLButtonElement;
      skipBtn.click();

      expect(onSkip).toHaveBeenCalled();
    });

    it('should call onSkip when modal closed', () => {
      const onSkip = jest.fn();

      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
        onSkip,
      });
      modal.open();

      modal.close();

      expect(onSkip).toHaveBeenCalled();
    });
  });

  describe('file browse button', () => {
    it('should trigger file input when browse button clicked', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      const browseBtn = modal.getElement().querySelector('#select-file-btn') as HTMLButtonElement;
      browseBtn.click();

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('file size formatting', () => {
    it('should format file sizes correctly', () => {
      modal = new ReceiptUploadModal({
        expenseId: 'exp123',
        sendMessage,
      });
      modal.open();

      const fileInput = modal.getElement().querySelector('#receipt-file-input') as HTMLInputElement;

      // Test KB size
      const kbFile = new File([new Uint8Array(1536)], 'file.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [kbFile],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change'));

      const fileSize = modal.getElement().querySelector('#file-size') as HTMLElement;
      expect(fileSize.textContent).toBe('1.5 KB');
    });
  });

  describe('showReceiptUploadModal helper', () => {
    it('should create and open modal through manager', () => {
      const modal = showReceiptUploadModal({
        expenseId: 'exp123',
        expenseName: 'Dinner',
        sendMessage,
      });

      expect(modal).toBeDefined();
      expect(modalManager.hasOpenModal()).toBe(true);
      expect(modalManager.getCurrentModal()).toBe(modal);
    });
  });
});
