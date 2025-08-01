import { ResponseNormalizer } from '../response-normalizer';

describe('ResponseNormalizer', () => {
  let normalizer: ResponseNormalizer;

  beforeEach(() => {
    normalizer = new ResponseNormalizer();
  });

  describe('normalizeExpenseListResponse', () => {
    it('should handle direct array format', () => {
      const directArrayResponse = [
        { id: '1', merchantAmount: 100, merchant: { name: 'Expense 1' } },
        { id: '2', merchantAmount: 200, merchant: { name: 'Expense 2' } },
      ];

      const result = normalizer.normalizeExpenseListResponse(directArrayResponse);

      expect(result.data).toEqual(directArrayResponse);
    });

    it('should handle data array format', () => {
      const dataArrayResponse = {
        data: [
          { id: '1', merchantAmount: 100, merchant: { name: 'Expense 1' } },
          { id: '2', merchantAmount: 200, merchant: { name: 'Expense 2' } },
        ],
        total: 2,
        page: 1,
      };

      const result = normalizer.normalizeExpenseListResponse(dataArrayResponse);

      expect(result).toEqual(dataArrayResponse);
    });

    it('should handle HAL embedded format', () => {
      const halResponse = {
        _embedded: {
          transactions: [
            { id: '1', merchantAmount: 100, merchant: { name: 'Expense 1' } },
            { id: '2', merchantAmount: 200, merchant: { name: 'Expense 2' } },
          ],
        },
        _links: { self: { href: '/expenses' } },
        page: { size: 20, totalElements: 2 },
      };

      const result = normalizer.normalizeExpenseListResponse(halResponse);

      expect(result.data).toEqual(halResponse._embedded.transactions);
    });

    it('should return empty data array for unknown formats', () => {
      const unknownResponse = {
        items: [{ id: '1', merchantAmount: 100 }],
        metadata: { total: 1 },
      };

      const result = normalizer.normalizeExpenseListResponse(unknownResponse);

      expect(result.data).toEqual([]);
    });

    it('should handle null response', () => {
      const result = normalizer.normalizeExpenseListResponse(null);

      expect(result.data).toEqual([]);
    });

    it('should handle undefined response', () => {
      const result = normalizer.normalizeExpenseListResponse(undefined);

      expect(result.data).toEqual([]);
    });

    it('should handle non-array data in data format', () => {
      const malformedDataResponse = {
        data: { id: '1', merchantAmount: 100 }, // Single object instead of array
        total: 1,
      };

      const result = normalizer.normalizeExpenseListResponse(malformedDataResponse);

      expect(result.data).toEqual([]);
    });

    it('should handle malformed HAL response', () => {
      const malformedHalResponse = {
        _embedded: {
          transactions: { id: '1', merchantAmount: 100 }, // Single object instead of array
        },
      };

      const result = normalizer.normalizeExpenseListResponse(malformedHalResponse);

      expect(result.data).toEqual([]);
    });

    it('should handle empty HAL embedded object', () => {
      const emptyHalResponse = {
        _embedded: {},
        _links: { self: { href: '/expenses' } },
      };

      const result = normalizer.normalizeExpenseListResponse(emptyHalResponse);

      expect(result.data).toEqual([]);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty arrays', () => {
      const result = normalizer.normalizeExpenseListResponse([]);

      expect(result.data).toEqual([]);
    });

    it('should handle empty objects', () => {
      const result = normalizer.normalizeExpenseListResponse({});

      expect(result.data).toEqual([]);
    });

    it('should handle objects with null data property', () => {
      const response = { data: null, total: 0 };

      const result = normalizer.normalizeExpenseListResponse(response);

      expect(result.data).toEqual([]);
    });

    it('should handle HAL response with null embedded property', () => {
      const response = { _embedded: null };

      const result = normalizer.normalizeExpenseListResponse(response);

      expect(result.data).toEqual([]);
    });
  });

  describe('data type validation', () => {
    it('should properly validate array responses', () => {
      const validArrayResponse = [
        { id: '1', merchantAmount: 100 },
        { id: '2', merchantAmount: 200 },
      ];

      const result = normalizer.normalizeExpenseListResponse(validArrayResponse);

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle mixed data types in arrays gracefully', () => {
      const mixedArray = [
        { id: '1', merchantAmount: 100 },
        'invalid string',
        { id: '2', merchantAmount: 200 },
        null,
        42,
      ];

      const result = normalizer.normalizeExpenseListResponse(mixedArray);

      // Should return the array as-is since we don't filter content in this normalizer
      expect(result.data).toEqual(mixedArray);
    });

    it('should preserve object properties in data format', () => {
      const responseWithMeta = {
        data: [{ id: '1', merchantAmount: 100 }],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      const result = normalizer.normalizeExpenseListResponse(responseWithMeta);

      // Should return the entire object since it matches expected format
      expect(result).toEqual(responseWithMeta);
    });
  });
});
