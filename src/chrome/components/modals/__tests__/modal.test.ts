import { Modal, ModalOptions } from '../modal';

describe('Modal', () => {
  let modal: Modal;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (modal && modal.isModalOpen()) {
      modal.close();
    }
  });

  describe('initialization', () => {
    it('should create modal with default options', () => {
      modal = new Modal();
      const element = modal.getElement();

      expect(element).toBeDefined();
      expect(element.classList.contains('modal')).toBe(true);
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('aria-modal')).toBe('true');
    });

    it('should create modal with custom title', () => {
      modal = new Modal({ title: 'Test Modal' });
      const element = modal.getElement();
      const title = element.querySelector('.modal-title');

      expect(title?.textContent).toBe('Test Modal');
    });

    it('should create modal with string content', () => {
      modal = new Modal({ content: 'Test content' });
      const element = modal.getElement();
      const body = element.querySelector('.modal-body');

      expect(body?.innerHTML).toBe('Test content');
    });

    it('should create modal with HTML element content', () => {
      const div = document.createElement('div');
      div.textContent = 'Test element';

      modal = new Modal({ content: div });
      const element = modal.getElement();
      const body = element.querySelector('.modal-body');

      expect(body?.firstElementChild).toBe(div);
    });

    it('should create modal with buttons', () => {
      const onClick = jest.fn();
      modal = new Modal({
        buttons: [
          { text: 'Cancel', onClick },
          { text: 'Submit', onClick },
        ],
      });

      const element = modal.getElement();
      const buttons = element.querySelectorAll('.modal-button');

      expect(buttons).toHaveLength(2);
      expect(buttons[0].textContent).toBe('Cancel');
      expect(buttons[1].textContent).toBe('Submit');
    });

    it('should add custom className', () => {
      modal = new Modal({ className: 'custom-modal' });
      const element = modal.getElement();

      expect(element.classList.contains('custom-modal')).toBe(true);
    });

    it('should create close button when closable', () => {
      modal = new Modal({ title: 'Test', closable: true });
      const element = modal.getElement();
      const closeBtn = element.querySelector('.modal-close');

      expect(closeBtn).toBeDefined();
    });

    it('should not create close button when not closable', () => {
      modal = new Modal({ title: 'Test', closable: false });
      const element = modal.getElement();
      const closeBtn = element.querySelector('.modal-close');

      expect(closeBtn).toBeNull();
    });
  });

  describe('open/close', () => {
    it('should open modal', () => {
      modal = new Modal();
      modal.open();

      expect(modal.isModalOpen()).toBe(true);
      expect(document.body.querySelector('.modal')).toBeDefined();
      expect(document.body.querySelector('.modal-backdrop')).toBeDefined();
    });

    it('should close modal', () => {
      modal = new Modal();
      modal.open();
      modal.close();

      expect(modal.isModalOpen()).toBe(false);
    });

    it('should call onOpen callback', () => {
      const onOpen = jest.fn();
      modal = new Modal({ onOpen });

      modal.open();

      expect(onOpen).toHaveBeenCalled();
    });

    it('should call onClose callback', () => {
      const onClose = jest.fn();
      modal = new Modal({ onClose });

      modal.open();
      modal.close();

      expect(onClose).toHaveBeenCalled();
    });

    it('should not open if already open', () => {
      const onOpen = jest.fn();
      modal = new Modal({ onOpen });

      modal.open();
      modal.open();

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('should not close if already closed', () => {
      const onClose = jest.fn();
      modal = new Modal({ onClose });

      modal.close();

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should close on ESC key when closeOnEsc is true', () => {
      modal = new Modal({ closeOnEsc: true });
      modal.open();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(modal.isModalOpen()).toBe(false);
    });

    it('should not close on ESC key when closeOnEsc is false', () => {
      modal = new Modal({ closeOnEsc: false });
      modal.open();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(modal.isModalOpen()).toBe(true);
    });

    it('should close on backdrop click when closeOnBackdrop is true', () => {
      modal = new Modal({ closeOnBackdrop: true });
      modal.open();

      const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
      backdrop?.click();

      expect(modal.isModalOpen()).toBe(false);
    });

    it('should not close on backdrop click when closeOnBackdrop is false', () => {
      modal = new Modal({ closeOnBackdrop: false });
      modal.open();

      const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
      backdrop?.click();

      expect(modal.isModalOpen()).toBe(true);
    });

    it('should execute button onClick handler', () => {
      const onClick = jest.fn();
      modal = new Modal({
        buttons: [{ text: 'Test', onClick }],
      });
      modal.open();

      const button = document.querySelector('.modal-button') as HTMLButtonElement;
      button?.click();

      expect(onClick).toHaveBeenCalledWith(modal);
    });

    it('should close after button click by default', async () => {
      const onClick = jest.fn();
      modal = new Modal({
        buttons: [{ text: 'Test', onClick }],
      });
      modal.open();

      const button = document.querySelector('.modal-button') as HTMLButtonElement;
      button?.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(modal.isModalOpen()).toBe(false);
    });

    it('should not close after button click when closeOnClick is false', async () => {
      const onClick = jest.fn();
      modal = new Modal({
        buttons: [{ text: 'Test', onClick, closeOnClick: false }],
      });
      modal.open();

      const button = document.querySelector('.modal-button') as HTMLButtonElement;
      button?.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(modal.isModalOpen()).toBe(true);
    });
  });

  describe('content manipulation', () => {
    it('should update content with string', () => {
      modal = new Modal({ content: 'Initial' });
      modal.setContent('Updated');

      const body = modal.getElement().querySelector('.modal-body');
      expect(body?.innerHTML).toBe('Updated');
    });

    it('should update content with element', () => {
      modal = new Modal({ content: 'Initial' });

      const div = document.createElement('div');
      div.textContent = 'New element';
      modal.setContent(div);

      const body = modal.getElement().querySelector('.modal-body');
      expect(body?.firstElementChild).toBe(div);
    });

    it('should update title', () => {
      modal = new Modal({ title: 'Initial' });
      modal.setTitle('Updated');

      const title = modal.getElement().querySelector('.modal-title');
      expect(title?.textContent).toBe('Updated');
    });
  });

  describe('focus management', () => {
    it('should focus first focusable element on open', () => {
      modal = new Modal({
        content: '<button id="test-btn">Test</button>',
      });
      modal.open();

      const button = document.getElementById('test-btn');
      expect(document.activeElement).toBe(button);
    });
  });
});
