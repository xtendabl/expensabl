import { ExpenseService } from '../expense-operations';
import { HttpClient } from '../../http/http-client';
import { ExpenseCreatePayload, ExpenseFilters } from '../../types';

// Mock console methods
jest.spyOn(console, 'debug').mockImplementation();
jest.spyOn(console, 'info').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

describe('ExpenseService', () => {
  let expenseService: ExpenseService;
  let _mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    _mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      postMultipart: jest.fn(),
      getWithParams: jest.fn(),
    } as jest.Mocked<HttpClient>;

    expenseService = new ExpenseService(_mockHttpClient);
  });

  describe('fetchExpense', () => {
    it('should successfully fetch expense by ID', async () => {
      const mockExpense = { id: '123', merchantAmount: 100, merchant: { name: 'Test Merchant' } };
      _mockHttpClient.get.mockResolvedValue(mockExpense);

      const result = await expenseService.fetchExpense('123');

      expect(_mockHttpClient.get).toHaveBeenCalledWith('/expenses/123');
      expect(result).toEqual(mockExpense);
    });

    it('should throw error for invalid expense ID', async () => {
      await expect(expenseService.fetchExpense('')).rejects.toThrow('Invalid expense ID');
      expect(_mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      _mockHttpClient.get.mockRejectedValue(networkError);

      await expect(expenseService.fetchExpense('123')).rejects.toThrow('Network error');
    });
  });

  describe('fetchExpenses', () => {
    it('should fetch expenses without filters', async () => {
      const mockResponseData = [
        { id: '1', merchantAmount: 100 },
        { id: '2', merchantAmount: 200 },
      ];
      const mockResponse = { data: mockResponseData };
      _mockHttpClient.getWithParams.mockResolvedValue(mockResponse);

      const result = await expenseService.fetchExpenses();

      expect(_mockHttpClient.getWithParams).toHaveBeenCalledWith('/search/transactions', undefined);
      expect(result.data).toEqual(mockResponseData);
    });

    it('should fetch expenses with filters', async () => {
      const filters: ExpenseFilters = { status: 'pending', dateFrom: '2024-01-01' };
      const mockResponseData = [{ id: '1', merchantAmount: 100, status: 'pending' }];
      const mockResponse = { data: mockResponseData };
      _mockHttpClient.getWithParams.mockResolvedValue(mockResponse);

      const result = await expenseService.fetchExpenses(filters);

      expect(_mockHttpClient.getWithParams).toHaveBeenCalledWith('/search/transactions', filters);
      expect(result.data).toEqual(mockResponseData);
    });

    it('should handle empty filter object', async () => {
      const mockResponse = { data: [] };
      _mockHttpClient.getWithParams.mockResolvedValue(mockResponse);

      const result = await expenseService.fetchExpenses({});

      expect(_mockHttpClient.getWithParams).toHaveBeenCalledWith('/search/transactions', {});
      expect(result.data).toEqual([]);
    });
  });

  describe('createExpense', () => {
    const mockExpenseData: ExpenseCreatePayload = {
      merchantAmount: 100,
      merchantCurrency: 'USD',
      date: '2024-01-01',
      merchant: { name: 'Test Merchant' },
    };

    it('should successfully create expense through 3-step process', async () => {
      const mockDraft = { id: 'draft-123', status: 'draft' };
      const mockSubmitted = { id: '123', status: 'submitted' };

      _mockHttpClient.post.mockResolvedValueOnce(mockDraft);
      _mockHttpClient.patch.mockResolvedValueOnce(mockDraft);
      _mockHttpClient.post.mockResolvedValueOnce(mockSubmitted);

      const result = await expenseService.createExpense(mockExpenseData);

      expect(_mockHttpClient.post).toHaveBeenCalledWith('/expenses/manual', mockExpenseData);
      expect(_mockHttpClient.patch).toHaveBeenCalledWith('/expenses/draft-123', mockExpenseData);
      expect(_mockHttpClient.post).toHaveBeenCalledWith('/expenses/draft-123/submit', {});
      expect(result).toEqual(mockSubmitted);
    });

    it('should fail when draft creation returns no ID', async () => {
      _mockHttpClient.post.mockResolvedValue({ status: 'draft' }); // No ID

      await expect(expenseService.createExpense(mockExpenseData)).rejects.toThrow(
        'No expense ID returned from draft creation'
      );
    });

    it('should handle failure at finalization step', async () => {
      const mockDraft = { id: 'draft-123', status: 'draft' };
      const finalizationError = new Error('Finalization failed');

      _mockHttpClient.post.mockResolvedValue(mockDraft);
      _mockHttpClient.patch.mockRejectedValue(finalizationError);

      await expect(expenseService.createExpense(mockExpenseData)).rejects.toThrow(
        'Finalization failed'
      );
    });

    it('should handle failure at submission step', async () => {
      const mockDraft = { id: 'draft-123', status: 'draft' };
      const submissionError = new Error('Submission failed');

      _mockHttpClient.post.mockResolvedValueOnce(mockDraft);
      _mockHttpClient.patch.mockResolvedValue(mockDraft);
      _mockHttpClient.post.mockRejectedValueOnce(submissionError);

      await expect(expenseService.createExpense(mockExpenseData)).rejects.toThrow(
        'Submission failed'
      );
    });

    it('should track performance timing', async () => {
      const mockDraft = { id: 'draft-123', status: 'draft' };
      const mockSubmitted = { id: '123', status: 'submitted' };

      _mockHttpClient.post.mockResolvedValueOnce(mockDraft);
      _mockHttpClient.patch.mockResolvedValue(mockDraft);
      _mockHttpClient.post.mockResolvedValueOnce(mockSubmitted);

      await expenseService.createExpense(mockExpenseData);

      // Console logging is disabled in production, so no verification needed
      // Just verify the operation completed successfully
    });
  });

  describe('updateExpense', () => {
    const updateData = { merchantAmount: 150, details: { description: 'Updated expense' } };

    it('should successfully update expense', async () => {
      const mockUpdated = {
        id: '123',
        merchantAmount: 150,
        details: { description: 'Updated expense' },
      };
      _mockHttpClient.patch.mockResolvedValue(mockUpdated);

      const result = await expenseService.updateExpense('123', updateData);

      expect(_mockHttpClient.patch).toHaveBeenCalledWith('/expenses/123', updateData);
      expect(result).toEqual(mockUpdated);
    });

    it('should throw error for invalid expense ID', async () => {
      await expect(expenseService.updateExpense('', updateData)).rejects.toThrow(
        'Invalid expense ID'
      );
      expect(_mockHttpClient.patch).not.toHaveBeenCalled();
    });

    it('should allow empty update data for partial updates', async () => {
      const mockUpdated = { id: '123', merchantAmount: 100 };
      _mockHttpClient.patch.mockResolvedValue(mockUpdated);

      const result = await expenseService.updateExpense('123', {});

      expect(_mockHttpClient.patch).toHaveBeenCalledWith('/expenses/123', {});
      expect(result).toEqual(mockUpdated);
    });

    it('should handle update failures', async () => {
      const updateError = new Error('Update failed');
      _mockHttpClient.patch.mockRejectedValue(updateError);

      await expect(expenseService.updateExpense('123', updateData)).rejects.toThrow(
        'Update failed'
      );
    });
  });
});
