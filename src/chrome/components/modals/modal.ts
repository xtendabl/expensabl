export interface ModalOptions {
  title?: string;
  content?: string | HTMLElement;
  className?: string;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  buttons?: ModalButton[];
}

export interface ModalButton {
  text: string;
  className?: string;
  onClick: (modal: Modal) => void | Promise<void>;
  closeOnClick?: boolean;
}

export class Modal {
  private element: HTMLElement;
  private backdrop: HTMLElement;
  private isOpen = false;
  private options: ModalOptions;
  private closeHandlers: (() => void)[] = [];

  constructor(options: ModalOptions = {}) {
    this.options = {
      closable: true,
      closeOnBackdrop: true,
      closeOnEsc: true,
      ...options,
    };

    this.element = this.createElement();
    this.backdrop = this.createBackdrop();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = `modal ${this.options.className || ''}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    if (this.options.title) {
      const header = document.createElement('div');
      header.className = 'modal-header';

      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.textContent = this.options.title;
      header.appendChild(title);

      if (this.options.closable) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.onclick = () => this.close();
        header.appendChild(closeBtn);
      }

      modalContent.appendChild(header);
    }

    if (this.options.content) {
      const body = document.createElement('div');
      body.className = 'modal-body';

      if (typeof this.options.content === 'string') {
        body.innerHTML = this.options.content;
      } else {
        body.appendChild(this.options.content);
      }

      modalContent.appendChild(body);
    }

    if (this.options.buttons && this.options.buttons.length > 0) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      this.options.buttons.forEach((buttonConfig) => {
        const button = document.createElement('button');
        button.className = `modal-button ${buttonConfig.className || ''}`;
        button.textContent = buttonConfig.text;
        button.onclick = async () => {
          await buttonConfig.onClick(this);
          if (buttonConfig.closeOnClick !== false) {
            this.close();
          }
        };
        footer.appendChild(button);
      });

      modalContent.appendChild(footer);
    }

    modal.appendChild(modalContent);
    return modal;
  }

  private createBackdrop(): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    if (this.options.closeOnBackdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      };
    }

    return backdrop;
  }

  private setupEventListeners(): void {
    if (this.options.closeOnEsc) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', escHandler);
      this.closeHandlers.push(() => document.removeEventListener('keydown', escHandler));
    }
  }

  open(): void {
    if (this.isOpen) return;

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);

    const zIndex = parseInt(this.element.style.zIndex || '1001');
    this.backdrop.style.zIndex = String(zIndex - 1);

    requestAnimationFrame(() => {
      this.backdrop.classList.add('modal-backdrop-visible');
      this.element.classList.add('modal-visible');
    });

    this.isOpen = true;

    const firstFocusable = this.element.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    if (this.options.onOpen) {
      this.options.onOpen();
    }
  }

  close(): void {
    if (!this.isOpen) return;

    this.element.classList.remove('modal-visible');
    this.backdrop.classList.remove('modal-backdrop-visible');

    const handleTransitionEnd = () => {
      this.element.removeEventListener('transitionend', handleTransitionEnd);
      this.element.remove();
      this.backdrop.remove();
    };

    this.element.addEventListener('transitionend', handleTransitionEnd);

    this.isOpen = false;

    this.closeHandlers.forEach((handler) => handler());
    this.closeHandlers = [];

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  isModalOpen(): boolean {
    return this.isOpen;
  }

  setContent(content: string | HTMLElement): void {
    const body = this.element.querySelector('.modal-body');
    if (body) {
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else {
        body.innerHTML = '';
        body.appendChild(content);
      }
    }
  }

  setTitle(title: string): void {
    const titleElement = this.element.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
}
