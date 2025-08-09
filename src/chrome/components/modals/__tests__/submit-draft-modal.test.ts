import { SubmitDraftModal, showSubmitDraftModal } from '../submit-draft-modal';
import { modalManager } from '../modal-manager';

// Mock modalManager
jest.mock('../modal-manager', () => ({
  modalManager: {
    open: jest.fn(),
    close: jest.fn(),
    closeAll: jest.fn(),
  },
}));

describe('SubmitDraftModal', () => {
  let modal: SubmitDraftModal;
  let onSubmit: jest.Mock;
  let onSaveAsDraft: jest.Mock;
  let onCancel: jest.Mock;

  beforeEach(() => {
    // Clear previous modals
    document.body.innerHTML = '';

    // Create mock callbacks
    onSubmit = jest.fn();
    onSaveAsDraft = jest.fn();
    onCancel = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (modal && modal.isModalOpen()) {
      modal.close();
    }
  });

  describe('Modal Creation', () => {
    it('should create modal with provided expense details', () => {
      modal = new SubmitDraftModal({
        expenseName: 'Test Merchant',
        expenseAmount: 100.5,
        currency: 'USD',
        onSubmit,
        onSaveAsDraft,
        onCancel,
      });

      const element = modal.getElement();
      expect(element).toBeDefined();
      expect(element.classList.contains('submit-draft-modal')).toBe(true);

      // Check expense info is displayed
      const expenseInfo = element.querySelector('.expense-info');
      expect(expenseInfo?.textContent).toContain('Test Merchant');
      expect(expenseInfo?.textContent).toContain('USD 100.50');
    });

    it('should create modal without expense details', () => {
      modal = new SubmitDraftModal({
        onSubmit,
        onSaveAsDraft,
      });

      const element = modal.getElement();
      const expenseInfo = element.querySelector('.expense-info');
      expect(expenseInfo).toBeNull();
    });

    it('should have correct modal title', () => {
      modal = new SubmitDraftModal({
        onSubmit,
        onSaveAsDraft,
      });

      const element = modal.getElement();
      const title = element.querySelector('.modal-title');
      expect(title?.textContent).toBe('Choose Submission Type');
    });
  });

  describe('Modal Buttons', () => {
    beforeEach(() => {
      modal = new SubmitDraftModal({
        expenseName: 'Test Expense',
        onSubmit,
        onSaveAsDraft,
        onCancel,
      });
      modal.open();
    });

    it('should have three buttons: Cancel, Save as Draft, Submit Now', () => {
      const buttons = modal.getElement().querySelectorAll('.modal-button');
      expect(buttons).toHaveLength(3);

      const buttonTexts = Array.from(buttons).map((btn) => btn.textContent);
      expect(buttonTexts).toContain('Cancel');
      expect(buttonTexts).toContain('Save as Draft');
      expect(buttonTexts).toContain('Submit Now');
    });

    it('should call onCancel when Cancel button is clicked', () => {
      const cancelButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Cancel'
      ) as HTMLButtonElement;

      cancelButton.click();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmit when Submit Now button is clicked', async () => {
      const submitButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Submit Now'
      ) as HTMLButtonElement;

      submitButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveAsDraft when Save as Draft button is clicked', async () => {
      const draftButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Save as Draft'
      ) as HTMLButtonElement;

      draftButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSaveAsDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe('Option Cards', () => {
    beforeEach(() => {
      modal = new SubmitDraftModal({
        onSubmit,
        onSaveAsDraft,
      });
      modal.open();
    });

    it('should have submit and draft option cards', () => {
      const submitOption = modal.getElement().querySelector('.submit-option');
      const draftOption = modal.getElement().querySelector('.draft-option');

      expect(submitOption).toBeDefined();
      expect(draftOption).toBeDefined();
    });

    it('should call onSubmit when submit option card is clicked', async () => {
      const submitOption = modal.getElement().querySelector('.submit-option') as HTMLElement;

      submitOption.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveAsDraft when draft option card is clicked', async () => {
      const draftOption = modal.getElement().querySelector('.draft-option') as HTMLElement;

      draftOption.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSaveAsDraft).toHaveBeenCalledTimes(1);
    });

    it('should display correct descriptions for each option', () => {
      const submitDescription = modal
        .getElement()
        .querySelector('.submit-option .option-description');
      const draftDescription = modal
        .getElement()
        .querySelector('.draft-option .option-description');

      expect(submitDescription?.textContent).toContain('Submit the expense immediately');
      expect(draftDescription?.textContent).toContain('Save the expense as a draft');
    });

    it('should display benefits for each option', () => {
      const submitBenefits = modal
        .getElement()
        .querySelectorAll('.submit-option .option-benefits li');
      const draftBenefits = modal
        .getElement()
        .querySelectorAll('.draft-option .option-benefits li');

      expect(submitBenefits.length).toBeGreaterThan(0);
      expect(draftBenefits.length).toBeGreaterThan(0);

      // Check some specific benefits
      const submitBenefitTexts = Array.from(submitBenefits).map((li) => li.textContent);
      expect(submitBenefitTexts).toContain('Faster reimbursement');

      const draftBenefitTexts = Array.from(draftBenefits).map((li) => li.textContent);
      expect(draftBenefitTexts).toContain('Add receipts later');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      modal = new SubmitDraftModal({
        onSubmit: jest.fn().mockRejectedValue(new Error('Submit failed')),
        onSaveAsDraft: jest.fn().mockRejectedValue(new Error('Draft failed')),
      });
      modal.open();
    });

    it('should re-enable buttons after submit error', async () => {
      const submitButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Submit Now'
      ) as HTMLButtonElement;

      submitButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Buttons should be re-enabled after error
      expect(submitButton.disabled).toBe(false);
    });

    it('should re-enable buttons after draft error', async () => {
      const draftButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Save as Draft'
      ) as HTMLButtonElement;

      draftButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Buttons should be re-enabled after error
      expect(draftButton.disabled).toBe(false);
    });

    it('should re-enable option cards after error', async () => {
      const submitOption = modal.getElement().querySelector('.submit-option') as HTMLElement;

      submitOption.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Option cards should not have disabled class
      expect(submitOption.classList.contains('disabled')).toBe(false);

      const draftOption = modal.getElement().querySelector('.draft-option') as HTMLElement;
      expect(draftOption.classList.contains('disabled')).toBe(false);
    });
  });

  describe('Modal Behavior', () => {
    beforeEach(() => {
      modal = new SubmitDraftModal({
        onSubmit: jest.fn().mockResolvedValue(undefined),
        onSaveAsDraft: jest.fn().mockResolvedValue(undefined),
        onCancel,
      });
    });

    it('should close modal after successful submit', async () => {
      modal.open();
      const closeSpy = jest.spyOn(modal, 'close');

      const submitButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Submit Now'
      ) as HTMLButtonElement;

      submitButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should close modal after successful draft save', async () => {
      modal.open();
      const closeSpy = jest.spyOn(modal, 'close');

      const draftButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Save as Draft'
      ) as HTMLButtonElement;

      draftButton.click();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not close on backdrop click', () => {
      modal.open();
      const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
      const closeSpy = jest.spyOn(modal, 'close');

      backdrop.click();

      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should close on ESC key press', () => {
      modal.open();
      const closeSpy = jest.spyOn(modal, 'close');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should call onCancel when closed via ESC', () => {
      modal.open();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('showSubmitDraftModal helper', () => {
    it('should create modal and call modalManager.open', () => {
      const options = {
        expenseName: 'Test',
        onSubmit: jest.fn(),
        onSaveAsDraft: jest.fn(),
      };

      const modal = showSubmitDraftModal(options);

      expect(modal).toBeInstanceOf(SubmitDraftModal);
      expect(modalManager.open).toHaveBeenCalledWith(modal);
    });
  });

  describe('Button State Management', () => {
    beforeEach(() => {
      modal = new SubmitDraftModal({
        onSubmit: jest
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
        onSaveAsDraft: jest
          .fn()
          .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))),
      });
      modal.open();
    });

    it('should disable all buttons during submit processing', async () => {
      const submitButton = Array.from(modal.getElement().querySelectorAll('.modal-button')).find(
        (btn) => btn.textContent === 'Submit Now'
      ) as HTMLButtonElement;

      const allButtons = modal.getElement().querySelectorAll('.modal-button');

      submitButton.click();

      // Immediately after click, buttons should be disabled
      allButtons.forEach((button) => {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      });

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 110));
    });

    it('should disable option cards during processing', async () => {
      const submitOption = modal.getElement().querySelector('.submit-option') as HTMLElement;
      const draftOption = modal.getElement().querySelector('.draft-option') as HTMLElement;

      submitOption.click();

      // Immediately after click, option cards should have disabled class
      expect(submitOption.classList.contains('disabled')).toBe(true);
      expect(draftOption.classList.contains('disabled')).toBe(true);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 110));
    });
  });
});
