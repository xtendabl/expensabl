import { AuthenticationModal, showAuthenticationModal } from '../authentication-modal';
import { modalManager } from '../modal-manager';

describe('AuthenticationModal', () => {
  let modal: AuthenticationModal;
  let sendMessage: jest.Mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    sendMessage = jest.fn();
    modalManager.closeAll();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (modal && modal.isModalOpen()) {
      modal.close();
    }
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should create authentication modal with correct content', () => {
      modal = new AuthenticationModal({
        sendMessage,
      });
      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.auth-modal-message h3')?.textContent).toBe(
        'Authentication Required'
      );
      expect(element.querySelector('.auth-modal-instructions')).toBeDefined();

      const buttons = element.querySelectorAll('.modal-button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0].textContent).toBe('Open Navan');
      expect(buttons[1].textContent).toBe('Check Authentication');
    });

    it('should start auto-checking on initialization', () => {
      sendMessage.mockResolvedValue({ success: false });

      modal = new AuthenticationModal({
        sendMessage,
      });
      modal.open();

      // Fast-forward time to trigger auto-check
      jest.advanceTimersByTime(2000);

      expect(sendMessage).toHaveBeenCalledWith({ action: 'checkAuth' });
    });
  });

  describe('open Navan', () => {
    it('should open Navan in new tab when button clicked', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation();

      modal = new AuthenticationModal({
        sendMessage,
      });
      modal.open();

      const openButton = document.querySelectorAll('.modal-button')[0] as HTMLButtonElement;
      openButton.click();

      expect(openSpy).toHaveBeenCalledWith('https://app.navan.com', '_blank');

      const status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.style.display).toBe('block');
      expect(status.textContent).toContain('Navan opened in a new tab');

      openSpy.mockRestore();
    });
  });

  describe('check authentication', () => {
    it('should show loading state while checking', async () => {
      sendMessage.mockResolvedValue({ success: false });

      modal = new AuthenticationModal({
        sendMessage,
      });
      modal.open();

      const checkButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;
      checkButton.click();

      const status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.innerHTML).toContain('loading-spinner');
      expect(status.textContent).toContain('Checking authentication');

      // Buttons should be disabled
      const buttons = document.querySelectorAll('.modal-button');
      buttons.forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });

      // Wait for check to complete
      await Promise.resolve();
    });

    it('should handle successful authentication', async () => {
      const onAuthenticated = jest.fn();
      sendMessage.mockResolvedValue({
        success: true,
        hasToken: true,
        isValid: true,
      });

      modal = new AuthenticationModal({
        sendMessage,
        onAuthenticated,
      });
      modal.open();

      const checkButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;
      checkButton.click();

      await Promise.resolve();

      const status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.textContent).toContain('Authentication successful');

      // Should auto-close after delay
      jest.advanceTimersByTime(1000);

      expect(onAuthenticated).toHaveBeenCalled();
      expect(modal.isModalOpen()).toBe(false);
    });

    it('should handle failed authentication with retry', async () => {
      sendMessage.mockResolvedValue({
        success: false,
        hasToken: false,
        isValid: false,
      });

      modal = new AuthenticationModal({
        sendMessage,
        maxRetries: 3,
      });
      modal.open();

      const checkButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      // First attempt
      checkButton.click();
      await Promise.resolve();

      let status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.textContent).toContain('Attempt 1/3');

      // Second attempt
      checkButton.click();
      await Promise.resolve();

      status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.textContent).toContain('Attempt 2/3');

      // Third attempt - should show error
      checkButton.click();
      await Promise.resolve();

      const error = document.querySelector('#authError') as HTMLElement;
      expect(error.style.display).toBe('block');
      expect(error.textContent).toContain('failed after 3 attempts');
    });

    it('should reset retry counter after max retries', async () => {
      sendMessage.mockResolvedValue({
        success: false,
        hasToken: false,
        isValid: false,
      });

      modal = new AuthenticationModal({
        sendMessage,
        maxRetries: 2,
      });
      modal.open();

      const checkButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      // Reach max retries
      checkButton.click();
      await Promise.resolve();
      checkButton.click();
      await Promise.resolve();

      expect(checkButton.textContent).toBe('Retry');

      // Click retry - should reset counter
      checkButton.click();
      await Promise.resolve();

      const status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.textContent).toContain('Attempt 1/2');
    });
  });

  describe('auto-check', () => {
    it('should auto-close on successful auto-check', async () => {
      const onAuthenticated = jest.fn();

      // First check fails, second succeeds
      sendMessage.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({
        success: true,
        hasToken: true,
        isValid: true,
      });

      modal = new AuthenticationModal({
        sendMessage,
        onAuthenticated,
      });
      modal.open();

      // First auto-check (fails)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(modal.isModalOpen()).toBe(true);

      // Second auto-check (succeeds)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const status = document.querySelector('#authStatus') as HTMLElement;
      expect(status.textContent).toContain('Authentication detected');

      // Should auto-close
      jest.advanceTimersByTime(1000);

      expect(onAuthenticated).toHaveBeenCalled();
      expect(modal.isModalOpen()).toBe(false);
    });

    it('should stop auto-check on close', () => {
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      modal = new AuthenticationModal({
        sendMessage,
      });
      modal.open();
      modal.close();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('showAuthenticationModal helper', () => {
    it('should create and open modal through manager', () => {
      const modal = showAuthenticationModal({
        sendMessage,
      });

      expect(modal).toBeDefined();
      expect(modalManager.hasOpenModal()).toBe(true);
      expect(modalManager.getCurrentModal()).toBe(modal);
    });
  });

  describe('cancel handling', () => {
    it('should call onCancel when modal is closed', () => {
      const onCancel = jest.fn();

      modal = new AuthenticationModal({
        sendMessage,
        onCancel,
      });
      modal.open();
      modal.close();

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
