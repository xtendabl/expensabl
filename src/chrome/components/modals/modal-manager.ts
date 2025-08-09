import { Modal, ModalOptions } from './modal';

interface QueuedModal {
  modal: Modal;
  options: ModalOptions;
}

class ModalManager {
  private static instance: ModalManager;
  private currentModal: Modal | null = null;
  private modalQueue: QueuedModal[] = [];
  private zIndexBase = 1000;
  private currentZIndex = 1000;

  private constructor() {}

  static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }

  open(modal: Modal): void {
    if (this.currentModal) {
      console.log('[ModalManager] Queueing modal as one is already open');
      this.modalQueue.push({ modal, options: {} });
      return;
    }

    console.log('[ModalManager] Opening modal');
    this.currentModal = modal;
    this.updateZIndex(modal);

    const originalOnClose = modal['options'].onClose;
    modal['options'].onClose = () => {
      console.log('[ModalManager] Modal onClose triggered');
      if (originalOnClose) {
        originalOnClose();
      }
      this.handleModalClose();
    };

    modal.open();
    console.log('[ModalManager] Modal opened');
  }

  openWithOptions(options: ModalOptions): Modal {
    const modal = new Modal(options);
    this.open(modal);
    return modal;
  }

  private updateZIndex(modal: Modal): void {
    this.currentZIndex = this.zIndexBase + this.modalQueue.length * 10;
    const element = modal.getElement();
    element.style.zIndex = String(this.currentZIndex + 1);
  }

  private handleModalClose(): void {
    this.currentModal = null;

    if (this.modalQueue.length > 0) {
      const next = this.modalQueue.shift();
      if (next) {
        setTimeout(() => {
          this.open(next.modal);
        }, 100);
      }
    }
  }

  closeAll(): void {
    this.modalQueue = [];
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }
  }

  getCurrentModal(): Modal | null {
    return this.currentModal;
  }

  hasOpenModal(): boolean {
    return this.currentModal !== null;
  }

  getQueueLength(): number {
    return this.modalQueue.length;
  }
}

export const modalManager = ModalManager.getInstance();
