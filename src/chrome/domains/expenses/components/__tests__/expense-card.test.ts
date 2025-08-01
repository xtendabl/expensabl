import { ExpenseCard } from '../expense-card';
import { ExpenseData } from '../../../../../features/expenses/types';
import { createMockExpense } from '../../__tests__/test-helpers';

describe('ExpenseCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const mockExpense = createMockExpense({
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    status: 'pending',
    accountAmount: 150.5,
    accountCurrency: 'USD',
    authorizationDate: '2024-01-15T10:30:00Z',
    prettyMerchantName: 'Coffee Shop',
    policyName: 'Travel',
    merchant: {
      uuid: 'merchant-123',
      category: 'RESTAURANT',
      name: 'Coffee Shop Inc',
      online: false,
      perDiem: false,
      timeZone: 'America/New_York',
      formattedAddress: '123 Coffee St',
      categoryGroup: 'FOOD_AND_DRINK',
    },
    instant: '2024-01-15T10:30:00Z',
    merchantAmount: 150.5,
    merchantCurrency: 'USD',
  });

  describe('render', () => {
    it('should render expense with all required fields', () => {
      const card = new ExpenseCard({ expense: mockExpense });
      const html = card.render();

      expect(html).toContain('Coffee Shop');
      expect(html).toContain('USD 150.50');
      expect(html).toContain('PENDING');
      expect(html).toContain('Travel');
      expect(html).toContain('data-expense-id="123e4567-e89b-12d3-a456-426614174000"');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalExpense = createMockExpense({
        accountAmount: 50,
        merchantAmount: 50,
        merchantCurrency: 'USD',
        prettyMerchantName: undefined,
        merchant: undefined,
        policyName: undefined,
        status: undefined as any,
      });

      const card = new ExpenseCard({ expense: minimalExpense });
      const html = card.render();

      expect(html).toContain('Unknown Merchant');
      expect(html).toContain('USD 50.00');
      expect(html).toContain('UNKNOWN');
      expect(html).toContain('Other');
    });

    it('should escape HTML in merchant names to prevent XSS', () => {
      const xssExpense = createMockExpense({
        ...mockExpense,
        prettyMerchantName: '<script>alert("XSS")</script>',
        merchant: {
          ...mockExpense.merchant,
          name: '<img src=x onerror=alert("XSS")>',
        },
      });

      const card = new ExpenseCard({ expense: xssExpense });
      const html = card.render();

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should format amount correctly with currency', () => {
      const expenseWithAmount = createMockExpense({
        ...mockExpense,
        accountAmount: 1234.567,
        accountCurrency: 'EUR',
      });

      const card = new ExpenseCard({ expense: expenseWithAmount });
      const html = card.render();

      expect(html).toContain('EUR 1234.57');
    });

    it('should display correct status class based on expense status', () => {
      const statuses = ['pending', 'approved', 'rejected', 'submitted'];

      statuses.forEach((status) => {
        const expense = { ...mockExpense, status };
        const card = new ExpenseCard({ expense });
        const html = card.render();

        expect(html).toContain(`expense-status ${status}`);
        expect(html).toContain(status.toUpperCase());
      });
    });

    it('should use authorizationDate when available, fallback to instant', () => {
      const withAuthDate = createMockExpense({ ...mockExpense });
      const withInstantOnly = createMockExpense({ ...mockExpense, authorizationDate: undefined });

      const card1 = new ExpenseCard({ expense: withAuthDate });
      const card2 = new ExpenseCard({ expense: withInstantOnly });

      const html1 = card1.render();
      const html2 = card2.render();

      expect(html1).toContain('1/15/2024');
      expect(html2).toContain('1/15/2024');
    });

    it('should handle different expense ID formats (uuid vs id)', () => {
      const withUuid = createMockExpense({ ...mockExpense });
      const withId = createMockExpense({ ...mockExpense, uuid: undefined, id: 'legacy-id-456' });

      const card1 = new ExpenseCard({ expense: withUuid });
      const card2 = new ExpenseCard({ expense: withId });

      expect(card1.render()).toContain('data-expense-id="123e4567-e89b-12d3-a456-426614174000"');
      expect(card2.render()).toContain('data-expense-id="legacy-id-456"');
    });
  });

  describe('onClick handler', () => {
    it('should call onClick callback with expense ID when clicked', () => {
      const onClick = jest.fn();
      const card = new ExpenseCard({ expense: mockExpense, onClick });

      card.mount(container);
      const element = container.querySelector('.expense-item') as HTMLElement;
      element.click();

      expect(onClick).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should not attach click listener when onClick prop is not provided', () => {
      const card = new ExpenseCard({ expense: mockExpense });
      card.mount(container);

      const element = container.querySelector('.expense-item') as HTMLElement;
      element.click(); // Should not throw

      expect(element).toBeTruthy();
    });

    it('should extract correct expense ID from data attribute', () => {
      const onClick = jest.fn();
      const expense = { ...mockExpense, uuid: 'test-uuid-789' };
      const card = new ExpenseCard({ expense, onClick });

      card.mount(container);
      const element = container.querySelector('.expense-item') as HTMLElement;
      element.click();

      expect(onClick).toHaveBeenCalledWith('test-uuid-789');
    });
  });

  describe('edge cases', () => {
    it('should handle zero amounts', () => {
      const zeroExpense = { ...mockExpense, accountAmount: 0 };
      const card = new ExpenseCard({ expense: zeroExpense });
      const html = card.render();

      expect(html).toContain('USD 0.00');
    });

    it('should handle negative amounts', () => {
      const negativeExpense = { ...mockExpense, accountAmount: -50.25 };
      const card = new ExpenseCard({ expense: negativeExpense });
      const html = card.render();

      expect(html).toContain('USD -50.25');
    });

    it('should handle very long merchant names', () => {
      const longName = 'A'.repeat(200);
      const longNameExpense = { ...mockExpense, prettyMerchantName: longName };
      const card = new ExpenseCard({ expense: longNameExpense });
      const html = card.render();

      expect(html).toContain(longName);
    });

    it('should handle invalid date formats', () => {
      const invalidDateExpense = { ...mockExpense, authorizationDate: 'invalid-date' };
      const card = new ExpenseCard({ expense: invalidDateExpense });
      const html = card.render();

      expect(html).toContain('Invalid Date');
    });
  });
});
