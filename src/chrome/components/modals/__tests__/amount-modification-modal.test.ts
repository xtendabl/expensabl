import { AmountModificationModal, showAmountModificationModal } from '../amount-modification-modal';
import { modalManager } from '../modal-manager';

describe('AmountModificationModal', () => {
  let modal: AmountModificationModal;

  beforeEach(() => {
    document.body.innerHTML = '';
    modalManager.closeAll();
  });

  afterEach(() => {
    if (modal && modal.isModalOpen()) {
      modal.close();
    }
  });

  describe('initialization', () => {
    it('should create modal with correct title and message', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100.5,
        currency: 'USD',
        expenseName: 'Taxi Ride',
        onConfirm,
      });
      modal.open();

      const element = modal.getElement();
      expect(element.querySelector('.modal-title')?.textContent).toBe('Modify Expense Amount');
      expect(element.querySelector('.modal-message')?.textContent).toContain('Taxi Ride');
    });

    it('should pre-populate with original amount', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 75.25,
        currency: 'EUR',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      expect(input.value).toBe('75.25');
    });

    it('should display currency label', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 50,
        currency: 'GBP',
        onConfirm,
      });
      modal.open();

      const currencyLabel = document.querySelector('.currency-label');
      expect(currencyLabel?.textContent).toBe('GBP');
    });

    it('should show original amount comparison', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const comparison = document.querySelector('.amount-comparison');
      expect(comparison?.textContent).toContain('Original amount');
      expect(comparison?.textContent).toContain('100');
    });
  });

  describe('validation', () => {
    it('should validate non-numeric input', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = 'abc';
      submitButton.click();

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toContain('valid number');
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should validate negative amounts', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = '-50';
      submitButton.click();

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toContain('greater than 0');
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should validate zero amount', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = '0';
      submitButton.click();

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toContain('greater than 0');
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should validate excessive decimal places', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = '99.999';
      submitButton.click();

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toContain('2 decimal places');
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should validate very large amounts', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = '9999999999';
      submitButton.click();

      const error = document.querySelector('.modal-error') as HTMLElement;
      expect(error.textContent).toContain('too large');
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('should call onConfirm with valid amount', async () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const submitButton = document.querySelectorAll('.modal-button')[1] as HTMLButtonElement;

      input.value = '150.75';
      submitButton.click();

      await new Promise((resolve) => process.nextTick(resolve));

      expect(onConfirm).toHaveBeenCalledWith(150.75);
    });

    it('should use original amount when cancelled without onCancel', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const cancelButton = document.querySelectorAll('.modal-button')[0] as HTMLButtonElement;
      cancelButton.click();

      expect(onConfirm).toHaveBeenCalledWith(100);
    });

    it('should call onConfirm with original amount when "Use Original" is clicked', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
        onCancel,
      });
      modal.open();

      const useOriginalButton = document.querySelectorAll('.modal-button')[0] as HTMLButtonElement;
      useOriginalButton.click();

      // "Use Original" should always call onConfirm with the original amount
      expect(onConfirm).toHaveBeenCalledWith(100);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when X button is clicked', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
        onCancel,
      });
      modal.open();

      const closeButton = document.querySelector('.modal-close') as HTMLButtonElement;
      closeButton.click();

      // X button should call onCancel only
      expect(onCancel).toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('amount comparison', () => {
    it('should update comparison when amount changes', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const comparison = document.querySelector('.amount-comparison') as HTMLElement;

      // Increase amount
      input.value = '125';
      input.dispatchEvent(new Event('input'));

      expect(comparison.textContent).toContain('+');
      expect(comparison.textContent).toContain('25');
      expect(comparison.textContent).toContain('25.0%');

      // Decrease amount
      input.value = '75';
      input.dispatchEvent(new Event('input'));

      expect(comparison.textContent).toContain('-');
      expect(comparison.textContent).toContain('25');
      expect(comparison.textContent).toContain('-25.0%');
    });

    it('should show original amount when value matches', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 100,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const input = document.querySelector('.modal-input') as HTMLInputElement;
      const comparison = document.querySelector('.amount-comparison') as HTMLElement;

      input.value = '100';
      input.dispatchEvent(new Event('input'));

      expect(comparison.textContent).toContain('Original amount');
      expect(comparison.textContent).not.toContain('%');
    });
  });

  describe('showAmountModificationModal helper', () => {
    it('should create and open modal through manager', () => {
      const onConfirm = jest.fn();

      const modal = showAmountModificationModal({
        originalAmount: 50,
        currency: 'CAD',
        onConfirm,
      });

      expect(modal).toBeDefined();
      expect(modalManager.hasOpenModal()).toBe(true);
      expect(modalManager.getCurrentModal()).toBe(modal);
    });
  });

  describe('currency formatting', () => {
    it('should format USD currency correctly', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 1234.56,
        currency: 'USD',
        onConfirm,
      });
      modal.open();

      const comparison = document.querySelector('.amount-comparison');
      expect(comparison?.textContent).toContain('$1,234.56');
    });

    it('should handle unsupported currency gracefully', () => {
      const onConfirm = jest.fn();

      modal = new AmountModificationModal({
        originalAmount: 999.99,
        currency: 'XYZ',
        onConfirm,
      });
      modal.open();

      const comparison = document.querySelector('.amount-comparison');
      expect(comparison?.textContent).toContain('XYZ');
      expect(comparison?.textContent).toContain('999.99');
    });
  });
});
