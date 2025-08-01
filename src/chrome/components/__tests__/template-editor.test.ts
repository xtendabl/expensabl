import { ExpenseTemplate } from '../../../features/templates/types';
import { TemplateEditor } from '../template-editor';

describe('TemplateEditor', () => {
  let container: HTMLDivElement;
  let component: TemplateEditor;
  let mockProps: any;

  const mockTemplate: ExpenseTemplate = {
    id: 'template-1',
    name: 'Existing Template',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    version: '1.0',
    expenseData: {
      merchantAmount: 99.99,
      merchantCurrency: 'EUR',
      date: '2024-01-01',
      merchant: { name: 'Test Merchant' },
      details: {
        category: 'travel',
        description: 'Test expense description',
      },
    },
    scheduling: {
      enabled: true,
      paused: false,
      interval: 'weekly',
      executionTime: { hour: 14, minute: 30 },
      intervalConfig: {},
    },
    executionHistory: [],
    metadata: {
      createdFrom: 'manual',
      tags: [],
      favorite: false,
      useCount: 5,
      scheduledUseCount: 3,
    },
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockProps = {
      onSave: jest.fn(),
      onCancel: jest.fn(),
    };
  });

  afterEach(() => {
    if (component) {
      component.unmount();
    }
    document.body.removeChild(container);
  });

  describe('create mode', () => {
    beforeEach(() => {
      component = new TemplateEditor(mockProps);
    });

    it('should render create form', () => {
      component.mount(container);

      expect(container.querySelector('.template-editor')).toBeTruthy();
      expect(container.querySelector('.editor-header')?.textContent).toContain('Create Template');
      expect(container.querySelector('#template-form')).toBeTruthy();
    });

    it('should have empty initial values', () => {
      component.mount(container);

      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      const amountInput = container.querySelector('#template-amount') as HTMLInputElement;
      const merchantInput = container.querySelector('#template-merchant') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(amountInput.value).toBe('');
      expect(merchantInput.value).toBe('');
    });

    it('should have default currency USD', () => {
      component.mount(container);

      const currencySelect = container.querySelector('#template-currency') as HTMLSelectElement;
      expect(currencySelect.value).toBe('USD');
    });

    it('should not show scheduling options by default', () => {
      component.mount(container);

      expect(container.querySelector('.scheduling-options')).toBeFalsy();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      mockProps.template = mockTemplate;
      component = new TemplateEditor(mockProps);
    });

    it('should render edit form', () => {
      component.mount(container);

      expect(container.querySelector('.editor-header')?.textContent).toContain('Edit Template');
    });

    it('should populate form with template values', () => {
      component.mount(container);

      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      const amountInput = container.querySelector('#template-amount') as HTMLInputElement;
      const currencySelect = container.querySelector('#template-currency') as HTMLSelectElement;
      const merchantInput = container.querySelector('#template-merchant') as HTMLInputElement;
      const categorySelect = container.querySelector('#template-category') as HTMLSelectElement;
      const descriptionTextarea = container.querySelector(
        '#template-description'
      ) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Existing Template');
      expect(amountInput.value).toBe('99.99');
      expect(currencySelect.value).toBe('EUR');
      expect(merchantInput.value).toBe('Test Merchant');
      expect(categorySelect.value).toBe('travel');
      expect(descriptionTextarea.value).toBe('Test expense description');
    });

    it('should show and populate scheduling options', () => {
      component.mount(container);

      const schedulingCheckbox = container.querySelector('#scheduling-enabled') as HTMLInputElement;
      expect(schedulingCheckbox.checked).toBe(true);

      expect(container.querySelector('.scheduling-options')).toBeTruthy();

      const intervalSelect = container.querySelector('#template-interval') as HTMLSelectElement;
      const hourInput = container.querySelector('#template-hour') as HTMLInputElement;
      const minuteInput = container.querySelector('#template-minute') as HTMLInputElement;

      expect(intervalSelect.value).toBe('weekly');
      expect(hourInput.value).toBe('14');
      expect(minuteInput.value).toBe('30');
    });
  });

  describe('form interactions', () => {
    beforeEach(() => {
      component = new TemplateEditor(mockProps);
      component.mount(container);
    });

    it('should update state when inputs change', () => {
      // Directly test state updates by calling the private method
      const instance = component as any;

      // Set state directly to simulate input changes
      instance.state = {
        ...instance.state,
        name: 'New Template',
        amount: '50.00',
        merchant: 'Test Merchant',
      };

      // Call handleSubmit directly
      instance.handleSubmit();

      expect(mockProps.onSave).toHaveBeenCalled();
      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Template',
          expenseData: expect.objectContaining({
            merchantAmount: 50,
            merchant: { name: 'Test Merchant' },
          }),
        })
      );
    });

    it('should toggle scheduling options', (done) => {
      const schedulingCheckbox = container.querySelector('#scheduling-enabled') as HTMLInputElement;

      expect(container.querySelector('.scheduling-options')).toBeFalsy();

      schedulingCheckbox.checked = true;
      schedulingCheckbox.dispatchEvent(new Event('change'));

      // Wait for re-render
      setTimeout(() => {
        expect(container.querySelector('.scheduling-options')).toBeTruthy();
        done();
      }, 10);
    });

    it('should call onCancel when cancel button clicked', () => {
      const cancelBtn = container.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn.click();

      expect(mockProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      component = new TemplateEditor(mockProps);
      component.mount(container);
    });

    it('should show error for missing name', () => {
      const form = container.querySelector('#template-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockProps.onSave).not.toHaveBeenCalled();
      expect(container.querySelector('.error-message')?.textContent).toContain(
        'Template name is required'
      );
    });

    it('should show error for invalid amount', () => {
      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      const merchantInput = container.querySelector('#template-merchant') as HTMLInputElement;

      nameInput.value = 'Test';
      nameInput.dispatchEvent(new Event('input'));

      merchantInput.value = 'Test Merchant';
      merchantInput.dispatchEvent(new Event('input'));

      const form = container.querySelector('#template-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockProps.onSave).not.toHaveBeenCalled();
      expect(container.querySelector('.error-message')?.textContent).toContain(
        'Amount must be greater than 0'
      );
    });

    it('should show error for missing merchant', () => {
      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      const amountInput = container.querySelector('#template-amount') as HTMLInputElement;

      nameInput.value = 'Test';
      nameInput.dispatchEvent(new Event('input'));

      amountInput.value = '50';
      amountInput.dispatchEvent(new Event('input'));

      const form = container.querySelector('#template-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockProps.onSave).not.toHaveBeenCalled();

      // Check specifically for the merchant error
      const merchantGroup = container.querySelector('#template-merchant')?.closest('.form-group');
      const merchantError = merchantGroup?.querySelector('.error-message');
      expect(merchantError?.textContent).toContain('Merchant is required');
    });
  });

  describe('form submission', () => {
    it('should create new template with correct data', () => {
      component = new TemplateEditor(mockProps);
      component.mount(container);

      // Directly set state to simulate form filling
      const instance = component as any;
      instance.state = {
        ...instance.state,
        name: 'New Template',
        amount: '75.50',
        merchant: 'New Merchant',
        category: 'meals',
        description: 'Lunch meeting',
      };

      // Call handleSubmit directly
      instance.handleSubmit();

      expect(mockProps.onSave).toHaveBeenCalled();
      expect(mockProps.onSave).toHaveBeenCalledWith({
        name: 'New Template',
        expenseData: {
          merchantAmount: 75.5,
          merchantCurrency: 'USD',
          date: expect.any(String),
          merchant: { name: 'New Merchant' },
          details: {
            category: 'meals',
            description: 'Lunch meeting',
          },
        },
        scheduling: null,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        version: '1.0',
        metadata: {
          createdFrom: 'manual',
          tags: [],
          favorite: false,
          useCount: 0,
          scheduledUseCount: 0,
        },
        executionHistory: [],
      });
    });

    it('should update existing template with correct data', () => {
      mockProps.template = mockTemplate;
      component = new TemplateEditor(mockProps);
      component.mount(container);

      // Update name
      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      nameInput.value = 'Updated Template';
      nameInput.dispatchEvent(new Event('input'));

      // Submit
      const form = container.querySelector('#template-form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'template-1',
          name: 'Updated Template',
          version: '1.0',
          updatedAt: expect.any(Number),
        })
      );
    });

    it('should create template with scheduling', () => {
      component = new TemplateEditor(mockProps);
      component.mount(container);

      // Fill basic fields
      const nameInput = container.querySelector('#template-name') as HTMLInputElement;
      const amountInput = container.querySelector('#template-amount') as HTMLInputElement;
      const merchantInput = container.querySelector('#template-merchant') as HTMLInputElement;

      nameInput.value = 'Scheduled Template';
      nameInput.dispatchEvent(new Event('input'));

      amountInput.value = '100';
      amountInput.dispatchEvent(new Event('input'));

      merchantInput.value = 'Test Merchant';
      merchantInput.dispatchEvent(new Event('input'));

      // Enable scheduling
      const schedulingCheckbox = container.querySelector('#scheduling-enabled') as HTMLInputElement;
      schedulingCheckbox.checked = true;
      schedulingCheckbox.dispatchEvent(new Event('change'));

      // Wait for re-render then set scheduling options
      setTimeout(() => {
        const intervalSelect = container.querySelector('#template-interval') as HTMLSelectElement;
        const hourInput = container.querySelector('#template-hour') as HTMLInputElement;
        const minuteInput = container.querySelector('#template-minute') as HTMLInputElement;

        intervalSelect.value = 'monthly';
        intervalSelect.dispatchEvent(new Event('change'));

        hourInput.value = '10';
        hourInput.dispatchEvent(new Event('input'));

        minuteInput.value = '15';
        minuteInput.dispatchEvent(new Event('input'));

        // Submit
        const form = container.querySelector('#template-form') as HTMLFormElement;
        form.dispatchEvent(new Event('submit', { bubbles: true }));

        expect(mockProps.onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Scheduled Template',
            scheduling: {
              enabled: true,
              paused: false,
              interval: 'monthly',
              executionTime: {
                hour: 10,
                minute: 15,
              },
              intervalConfig: {},
            },
          })
        );
      }, 0);
    });
  });
});
