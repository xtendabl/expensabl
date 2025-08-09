import { ExpenseService } from '../expense-operations';
import { HttpClient } from '../../http/http-client';
import { ExpenseCreatePayload } from '../../types';

describe('ExpenseService - Draft Support', () => {
  let service: ExpenseService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getWithParams: jest.fn(),
    } as any;

    service = new ExpenseService(mockHttpClient);
  });

  describe('createExpense with isDraft', () => {
    const baseExpenseData: ExpenseCreatePayload = {
      merchantAmount: 100.0,
      merchantCurrency: 'USD',
      date: '2024-01-15',
      merchant: { name: 'Test Merchant' },
    };

    it('should skip submission step when isDraft is true', async () => {
      const mockDraft = { id: 'draft-123', uuid: 'draft-123', status: 'DRAFT' };
      const mockFinalized = { ...mockDraft, status: 'DRAFT' };

      mockHttpClient.post.mockResolvedValueOnce(mockDraft); // Draft creation
      mockHttpClient.patch.mockResolvedValueOnce(mockFinalized); // Finalization
      mockHttpClient.get.mockResolvedValueOnce(mockFinalized); // Fetch final state

      const result = await service.createExpense({
        ...baseExpenseData,
        isDraft: true,
      });

      // Verify the submission endpoint was NOT called
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1); // Only draft creation
      expect(mockHttpClient.post).toHaveBeenCalledWith('/expenses/manual', expect.any(Object));
      expect(mockHttpClient.post).not.toHaveBeenCalledWith(
        '/expenses/draft-123/submit',
        expect.any(Object)
      );

      // Verify the expense was fetched instead
      expect(mockHttpClient.get).toHaveBeenCalledWith('/expenses/draft-123');

      expect(result.status).toBe('DRAFT');
    });

    it('should submit expense when isDraft is false', async () => {
      const mockDraft = { id: 'exp-123', uuid: 'exp-123', status: 'DRAFT' };
      const mockFinalized = { ...mockDraft, status: 'DRAFT' };
      const mockSubmitted = { ...mockDraft, status: 'SUBMITTED' };

      mockHttpClient.post
        .mockResolvedValueOnce(mockDraft) // Draft creation
        .mockResolvedValueOnce(mockSubmitted); // Submission
      mockHttpClient.patch.mockResolvedValueOnce(mockFinalized); // Finalization

      const result = await service.createExpense({
        ...baseExpenseData,
        isDraft: false,
      });

      // Verify the submission endpoint WAS called
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(
        1,
        '/expenses/manual',
        expect.any(Object)
      );
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(2, '/expenses/exp-123/submit', {});

      expect(result.status).toBe('SUBMITTED');
    });

    it('should submit expense when isDraft is not provided (default behavior)', async () => {
      const mockDraft = { id: 'exp-456', uuid: 'exp-456', status: 'DRAFT' };
      const mockFinalized = { ...mockDraft, status: 'DRAFT' };
      const mockSubmitted = { ...mockDraft, status: 'SUBMITTED' };

      mockHttpClient.post
        .mockResolvedValueOnce(mockDraft) // Draft creation
        .mockResolvedValueOnce(mockSubmitted); // Submission
      mockHttpClient.patch.mockResolvedValueOnce(mockFinalized); // Finalization

      const result = await service.createExpense(baseExpenseData);

      // Verify default behavior includes submission
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.post).toHaveBeenNthCalledWith(2, '/expenses/exp-456/submit', {});

      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('submitDraftExpense', () => {
    it('should submit a draft expense successfully', async () => {
      const expenseId = 'draft-789';
      const mockSubmitted = {
        id: expenseId,
        uuid: expenseId,
        status: 'SUBMITTED',
        merchantAmount: 100,
      };

      mockHttpClient.post.mockResolvedValueOnce(mockSubmitted);

      const result = await service.submitDraftExpense(expenseId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/expenses/${expenseId}/submit`, {});
      expect(result.status).toBe('SUBMITTED');
    });

    it('should throw error for invalid expense ID', async () => {
      await expect(service.submitDraftExpense('')).rejects.toThrow();
      await expect(service.submitDraftExpense('   ')).rejects.toThrow();

      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors during submission', async () => {
      const expenseId = 'draft-error';
      const apiError = new Error('API Error: Cannot submit expense');

      mockHttpClient.post.mockRejectedValueOnce(apiError);

      await expect(service.submitDraftExpense(expenseId)).rejects.toThrow(
        'API Error: Cannot submit expense'
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(`/expenses/${expenseId}/submit`, {});
    });
  });

  describe('draft expense workflow', () => {
    it('should support full draft workflow: create as draft, update, then submit', async () => {
      const expenseData: ExpenseCreatePayload = {
        merchantAmount: 50.0,
        merchantCurrency: 'EUR',
        date: '2024-02-01',
        merchant: { name: 'Draft Test' },
        isDraft: true,
      };

      const mockDraft = {
        id: 'draft-workflow',
        uuid: 'draft-workflow',
        status: 'DRAFT',
        merchantAmount: 50,
      };
      const mockUpdated = { ...mockDraft, merchantAmount: 75 };
      const mockSubmitted = { ...mockUpdated, status: 'SUBMITTED' };

      // Create as draft
      mockHttpClient.post.mockResolvedValueOnce(mockDraft);
      mockHttpClient.patch.mockResolvedValueOnce(mockDraft);
      mockHttpClient.get.mockResolvedValueOnce(mockDraft);

      const draftExpense = await service.createExpense(expenseData);
      expect(draftExpense.status).toBe('DRAFT');

      // Update the draft
      mockHttpClient.patch.mockResolvedValueOnce(mockUpdated);
      const updatedExpense = await service.updateExpense('draft-workflow', { merchantAmount: 75 });
      expect(updatedExpense.merchantAmount).toBe(75);

      // Submit the draft
      mockHttpClient.post.mockResolvedValueOnce(mockSubmitted);
      const submittedExpense = await service.submitDraftExpense('draft-workflow');
      expect(submittedExpense.status).toBe('SUBMITTED');
    });
  });
});
