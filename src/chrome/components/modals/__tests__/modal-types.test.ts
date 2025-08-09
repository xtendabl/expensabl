import { ConfirmModal, PromptModal, LoadingModal, confirm, prompt, loading } from '../modal-types';
import { modalManager } from '../modal-manager';

describe('Modal Types', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    modalManager.closeAll();
  });

  afterEach(() => {
    modalManager.closeAll();
  });

  describe('ConfirmModal', () => {
    it('should create confirm modal with options', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const modal = new ConfirmModal({
        title: 'Confirm Action',
        message: 'Are you sure?',
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm,
        onCancel,
      });

      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-title')?.textContent).toBe('Confirm Action');
      expect(element.querySelector('.modal-body')?.textContent).toBe('Are you sure?');

      const buttons = element.querySelectorAll('.modal-button');
      expect(buttons[0].textContent).toBe('No');
      expect(buttons[1].textContent).toBe('Yes');
    });

    it('should handle dangerous confirm modal', () => {
      const modal = new ConfirmModal({
        title: 'Delete',
        message: 'This cannot be undone',
        onConfirm: jest.fn(),
        dangerous: true,
      });

      modal.open();

      const element = modal.getElement();
      expect(element.classList.contains('confirm-modal-danger')).toBe(true);

      const confirmButton = element.querySelectorAll('.modal-button')[1];
      expect(confirmButton.classList.contains('modal-button-danger')).toBe(true);
    });

    it('should call onConfirm when confirmed', async () => {
      const onConfirm = jest.fn();

      const modal = new ConfirmModal({
        title: 'Confirm',
        message: 'Continue?',
        onConfirm,
      });

      modal.open();

      const confirmButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;
      confirmButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should call onCancel when cancelled', () => {
      const onCancel = jest.fn();

      const modal = new ConfirmModal({
        title: 'Confirm',
        message: 'Continue?',
        onConfirm: jest.fn(),
        onCancel,
      });

      modal.open();

      const cancelButton = document.querySelectorAll('.modal-button')[0] as HTMLButtonElement;
      cancelButton.click();

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('PromptModal', () => {
    it('should create prompt modal with options', () => {
      const modal = new PromptModal({
        title: 'Enter Name',
        message: 'Please enter your name',
        placeholder: 'John Doe',
        defaultValue: 'Jane',
        submitText: 'Save',
        cancelText: 'Back',
        onSubmit: jest.fn(),
      });

      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-title')?.textContent).toBe('Enter Name');
      expect(element.querySelector('.modal-message')?.textContent).toBe('Please enter your name');

      const input = element.querySelector('.modal-input') as HTMLInputElement;
      expect(input.placeholder).toBe('John Doe');
      expect(input.value).toBe('Jane');

      const buttons = element.querySelectorAll('.modal-button');
      expect(buttons[0].textContent).toBe('Back');
      expect(buttons[1].textContent).toBe('Save');
    });

    it('should call onSubmit with input value', async () => {
      const onSubmit = jest.fn();

      const modal = new PromptModal({
        title: 'Input',
        onSubmit,
      });

      modal.open();
      modal.setValue('test value');

      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;
      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledWith('test value');
    });

    it('should validate input', () => {
      const validate = jest.fn((value) => (value.length < 3 ? 'Too short' : null));

      const modal = new PromptModal({
        title: 'Input',
        onSubmit: jest.fn(),
        validate,
      });

      modal.open();
      modal.setValue('ab');

      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;
      submitButton.click();

      expect(validate).toHaveBeenCalledWith('ab');

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toBe('Too short');
      expect(error.style.display).toBe('block');
    });

    it('should submit on Enter key', () => {
      const onSubmit = jest.fn();

      const modal = new PromptModal({
        title: 'Input',
        onSubmit,
      });

      modal.open();
      modal.setValue('test');

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(onSubmit).toHaveBeenCalledWith('test');
    });

    it('should show and hide errors', () => {
      const modal = new PromptModal({
        title: 'Input',
        onSubmit: jest.fn(),
      });

      modal.open();

      modal.showError('An error occurred');
      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toBe('An error occurred');
      expect(error.style.display).toBe('block');

      modal.hideError();
      expect(error.style.display).toBe('none');
    });
  });

  describe('LoadingModal', () => {
    it('should create loading modal', () => {
      const modal = new LoadingModal({
        title: 'Processing',
        message: 'Please wait...',
      });

      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-title')?.textContent).toBe('Processing');
      expect(element.querySelector('.modal-message')?.textContent).toBe('Please wait...');
      expect(element.querySelector('.modal-spinner')).toBeDefined();
      expect(element.classList.contains('loading-modal')).toBe(true);
    });

    it('should create loading modal with progress', () => {
      const modal = new LoadingModal({
        message: 'Uploading...',
        showProgress: true,
      });

      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-progress')).toBeDefined();
      expect(element.querySelector('.modal-progress-bar')).toBeDefined();
    });

    it('should update message', () => {
      const modal = new LoadingModal({
        message: 'Starting...',
      });

      modal.open();
      modal.updateMessage('Processing...');

      const message = document.querySelector('.modal-message');
      expect(message?.textContent).toBe('Processing...');
    });

    it('should update progress', () => {
      const modal = new LoadingModal({
        message: 'Loading',
        showProgress: true,
      });

      modal.open();
      modal.updateProgress(50);

      const progressBar = document.querySelector('.modal-progress-bar') as HTMLElement;
      expect(progressBar.style.width).toBe('50%');
    });

    it('should not be closable', () => {
      const modal = new LoadingModal({
        message: 'Loading',
      });

      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-close')).toBeNull();

      const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
      backdrop.click();

      expect(modal.isModalOpen()).toBe(true);
    });
  });

  describe('helper functions', () => {
    it('should open confirm modal via helper', () => {
      const onConfirm = jest.fn();

      confirm({
        title: 'Confirm',
        message: 'Are you sure?',
        onConfirm,
      });

      expect(modalManager.hasOpenModal()).toBe(true);
      expect(document.querySelector('.confirm-modal')).toBeDefined();
    });

    it('should open prompt modal via helper', () => {
      const onSubmit = jest.fn();

      prompt({
        title: 'Input',
        onSubmit,
      });

      expect(modalManager.hasOpenModal()).toBe(true);
      expect(document.querySelector('.prompt-modal')).toBeDefined();
    });

    it('should open loading modal via helper', () => {
      const modal = loading({
        message: 'Loading...',
      });

      expect(modalManager.hasOpenModal()).toBe(true);
      expect(document.querySelector('.loading-modal')).toBeDefined();
      expect(modal).toBeDefined();
    });
  });
});
