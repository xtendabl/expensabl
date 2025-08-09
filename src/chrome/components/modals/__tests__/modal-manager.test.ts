import { Modal } from '../modal';
import { modalManager } from '../modal-manager';

describe('ModalManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    modalManager.closeAll();
  });

  afterEach(() => {
    modalManager.closeAll();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      expect(modalManager).toBeDefined();
      expect(modalManager).toBe(modalManager);
    });
  });

  describe('modal management', () => {
    it('should open modal', () => {
      const modal = new Modal({ title: 'Test' });
      modalManager.open(modal);

      expect(modalManager.hasOpenModal()).toBe(true);
      expect(modalManager.getCurrentModal()).toBe(modal);
    });

    it('should queue modal if one is already open', () => {
      const modal1 = new Modal({ title: 'Modal 1' });
      const modal2 = new Modal({ title: 'Modal 2' });

      modalManager.open(modal1);
      modalManager.open(modal2);

      expect(modalManager.getCurrentModal()).toBe(modal1);
      expect(modalManager.getQueueLength()).toBe(1);
    });

    it('should open queued modal after current closes', (done) => {
      const modal1 = new Modal({ title: 'Modal 1' });
      const modal2 = new Modal({ title: 'Modal 2' });

      modalManager.open(modal1);
      modalManager.open(modal2);

      modal1.close();

      setTimeout(() => {
        expect(modalManager.getCurrentModal()).toBe(modal2);
        expect(modalManager.getQueueLength()).toBe(0);
        done();
      }, 150);
    });

    it('should close all modals', () => {
      const modal1 = new Modal({ title: 'Modal 1' });
      const modal2 = new Modal({ title: 'Modal 2' });

      modalManager.open(modal1);
      modalManager.open(modal2);

      modalManager.closeAll();

      expect(modalManager.hasOpenModal()).toBe(false);
      expect(modalManager.getQueueLength()).toBe(0);
    });

    it('should create and open modal with options', () => {
      const onOpen = jest.fn();
      const modal = modalManager.openWithOptions({
        title: 'Test',
        content: 'Content',
        onOpen,
      });

      expect(modal).toBeDefined();
      expect(modalManager.getCurrentModal()).toBe(modal);
      expect(onOpen).toHaveBeenCalled();
    });
  });

  describe('z-index management', () => {
    it('should set appropriate z-index for modals', () => {
      const modal = new Modal({ title: 'Test' });
      modalManager.open(modal);

      const element = modal.getElement();
      const zIndex = window.getComputedStyle(element).zIndex;

      expect(parseInt(zIndex || '0')).toBeGreaterThan(1000);
    });
  });
});
