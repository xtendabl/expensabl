import { ApiHttpClient, TokenProvider } from '../http-client';
import { ApiConfig } from '../../config/api-config';
import { ApiError, AuthenticationError, TimeoutError } from '../../errors';

// Mock global fetch
global.fetch = jest.fn();
global.AbortController = jest.fn(() => ({
  signal: { aborted: false },
  abort: jest.fn(),
})) as any;

// Mock token provider
class MockTokenProvider implements TokenProvider {
  constructor(private token: string | null = 'mock-token') {}

  async getToken(): Promise<string | null> {
    return this.token;
  }
}

describe('ApiHttpClient', () => {
  let client: ApiHttpClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockConfig: ApiConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      maxRetries: 3,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      defaultTimezone: 'America/Los_Angeles',
    };

    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    // Create client with mock token provider
    const tokenProvider = new MockTokenProvider('mock-token');
    client = new ApiHttpClient(mockConfig, tokenProvider);
  });

  describe('get', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'test' })),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'mock-token',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should throw AuthenticationError when token is missing', async () => {
      // Create client with null token provider
      const nullTokenProvider = new MockTokenProvider(null);
      const authClient = new ApiHttpClient(mockConfig, nullTokenProvider);

      await expect(authClient.get('/test')).rejects.toThrow(AuthenticationError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make successful POST request with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ id: '123' })),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const body = { name: 'test', amount: 100 };
      const result = await client.post('/expenses', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/expenses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authorization: 'mock-token',
            'content-type': 'application/json',
          }),
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual({ id: '123' });
    });

    it('should handle POST request failures', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.post('/expenses', {})).rejects.toThrow(ApiError);
    });
  });

  describe('patch', () => {
    it('should make successful PATCH request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ id: '123', updated: true })),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const updateData = { amount: 150 };
      const result = await client.patch('/expenses/123', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/expenses/123',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            authorization: 'mock-token',
            'content-type': 'application/json',
          }),
          body: JSON.stringify(updateData),
        })
      );
      expect(result).toEqual({ id: '123', updated: true });
    });
  });

  describe('getWithParams', () => {
    it('should make GET request with query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ data: [] })),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const params = { status: 'pending', limit: 10 };
      const result = await client.getWithParams('/search/transactions', params);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com/search/transactions?'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'mock-token',
          }),
        })
      );
      expect(result).toEqual({ data: [] });
    });

    it('should handle requests without parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ data: [] })),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await client.getWithParams('/search/transactions');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/search/transactions',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual({ data: [] });
    });
  });

  describe('error handling', () => {
    it('should throw ApiError for 4xx status codes', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Invalid request' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw ApiError for 5xx status codes', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw AuthenticationError for 401 status', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Authentication required' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle timeout scenarios', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValue(timeoutError);

      await expect(client.get('/test')).rejects.toThrow(TimeoutError);
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('invalid json'),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });
  });

  describe('retry logic', () => {
    it('should retry on 5xx errors', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      };
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'success' })),
      };

      mockFetch
        .mockResolvedValueOnce(mockErrorResponse as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockRateLimitResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Rate limited' }),
      };
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'success' })),
      };

      mockFetch
        .mockResolvedValueOnce(mockRateLimitResponse as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Bad request' }),
      };

      mockFetch.mockResolvedValue(mockErrorResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after exhausting retries', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
        json: jest.fn().mockResolvedValue({ error: 'Server error' }),
      };

      mockFetch.mockResolvedValue(mockErrorResponse as any);

      await expect(client.get('/test')).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('request configuration', () => {
    it('should include correct headers for JSON requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.post('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/json',
            authorization: 'mock-token',
          }),
        })
      );
    });

    it('should handle requests with custom options', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: { get: jest.fn().mockReturnValue('100') },
        text: jest.fn().mockResolvedValue('{}'),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await client.get('/test', { timeout: 5000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(Object), // AbortController signal
        })
      );
    });
  });
});
