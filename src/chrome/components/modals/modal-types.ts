import { Modal, ModalOptions } from './modal';
import { modalManager } from './modal-manager';

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  dangerous?: boolean;
}

export class ConfirmModal extends Modal {
  constructor(options: ConfirmModalOptions) {
    super({
      title: options.title,
      content: options.message,
      className: `confirm-modal ${options.dangerous ? 'confirm-modal-danger' : ''}`,
      buttons: [
        {
          text: options.cancelText || 'Cancel',
          className: 'modal-button-secondary',
          onClick: () => {
            if (options.onCancel) {
              options.onCancel();
            }
          },
        },
        {
          text: options.confirmText || 'Confirm',
          className: options.dangerous ? 'modal-button-danger' : 'modal-button-primary',
          onClick: async () => {
            await options.onConfirm();
          },
        },
      ],
    });
  }
}

export interface PromptModalOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  validate?: (value: string) => string | null;
}

export class PromptModal extends Modal {
  private inputElement: HTMLInputElement;
  private errorElement: HTMLElement;

  constructor(options: PromptModalOptions) {
    const content = document.createElement('div');

    if (options.message) {
      const message = document.createElement('p');
      message.className = 'modal-message';
      message.textContent = options.message;
      content.appendChild(message);
    }

    const input = document.createElement('input');
    input.className = 'modal-input';
    input.type = options.inputType || 'text';
    input.placeholder = options.placeholder || '';
    input.value = options.defaultValue || '';
    content.appendChild(input);

    const error = document.createElement('div');
    error.className = 'modal-error';
    error.style.display = 'none';
    content.appendChild(error);

    super({
      title: options.title,
      content,
      className: 'prompt-modal',
      buttons: [
        {
          text: options.cancelText || 'Cancel',
          className: 'modal-button-secondary',
          onClick: () => {
            if (options.onCancel) {
              options.onCancel();
            }
          },
        },
        {
          text: options.submitText || 'Submit',
          className: 'modal-button-primary',
          onClick: async (modal) => {
            const value = input.value.trim();

            if (options.validate) {
              const errorMessage = options.validate(value);
              if (errorMessage) {
                error.textContent = errorMessage;
                error.style.display = 'block';
                return;
              }
            }

            await options.onSubmit(value);
          },
          closeOnClick: false,
        },
      ],
      onOpen: () => {
        setTimeout(() => input.focus(), 100);
      },
      onClose: options.onClose,
    });

    this.inputElement = input;
    this.errorElement = error;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const submitButton = this.getElement().querySelector(
          '.modal-button-primary'
        ) as HTMLButtonElement;
        submitButton?.click();
      }
    });
  }

  getValue(): string {
    return this.inputElement.value.trim();
  }

  setValue(value: string): void {
    this.inputElement.value = value;
  }

  showError(message: string): void {
    this.errorElement.textContent = message;
    this.errorElement.style.display = 'block';
  }

  hideError(): void {
    this.errorElement.style.display = 'none';
  }
}

export interface LoadingModalOptions {
  title?: string;
  message: string;
  showProgress?: boolean;
}

export class LoadingModal extends Modal {
  private progressElement?: HTMLElement;

  constructor(options: LoadingModalOptions) {
    const content = document.createElement('div');
    content.className = 'loading-modal-content';

    const spinner = document.createElement('div');
    spinner.className = 'modal-spinner';
    content.appendChild(spinner);

    const message = document.createElement('p');
    message.className = 'modal-message';
    message.textContent = options.message;
    content.appendChild(message);

    let progressElement: HTMLElement | undefined;
    if (options.showProgress) {
      const progress = document.createElement('div');
      progress.className = 'modal-progress';
      progress.innerHTML = '<div class="modal-progress-bar"></div>';
      content.appendChild(progress);
      progressElement = progress.querySelector('.modal-progress-bar') as HTMLElement;
    }

    super({
      title: options.title,
      content,
      className: 'loading-modal',
      closable: false,
      closeOnBackdrop: false,
      closeOnEsc: false,
    });

    this.progressElement = progressElement;
  }

  updateMessage(message: string): void {
    const messageElement = this.getElement().querySelector('.modal-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  updateProgress(percent: number): void {
    if (this.progressElement) {
      this.progressElement.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }
}

export function confirm(options: ConfirmModalOptions): void {
  const modal = new ConfirmModal(options);
  modalManager.open(modal);
}

export function prompt(options: PromptModalOptions): void {
  const modal = new PromptModal(options);
  modalManager.open(modal);
}

export function loading(options: LoadingModalOptions): LoadingModal {
  const modal = new LoadingModal(options);
  modalManager.open(modal);
  return modal;
}
