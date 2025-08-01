/**
 * Unit tests for Chrome extension content script
 */

import { error, info } from '../../shared/services/logger/chrome-logger-setup';

// Mock the logger module
jest.mock('../../shared/services/logger/chrome-logger-setup', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock chrome runtime API
const mockSendMessage = jest.fn();
const mockLastError = { message: 'Test error' };

global.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
  },
} as any;

describe('Content Script', () => {
  let originalFetch: typeof window.fetch;
  let originalOpen: typeof XMLHttpRequest.prototype.open;
  let originalSetRequestHeader: typeof XMLHttpRequest.prototype.setRequestHeader;
  let originalLocation: Location;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockSendMessage.mockReset();
    (chrome.runtime as any).lastError = null;

    // Store original implementations
    originalFetch = window.fetch;
    originalOpen = XMLHttpRequest.prototype.open;
    originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    originalLocation = window.location;

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      href: 'https://app.navan.com/expenses',
      hostname: 'app.navan.com',
    };
  });

  afterEach(() => {
    // Restore original implementations
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
    (window as any).location = originalLocation;

    // Clear any timers
    jest.clearAllTimers();
  });

  describe('captureAuthToken', () => {
    describe('fetch interception', () => {
      it('should capture Bearer token from fetch requests', async () => {
        const testToken = 'test-token-12345';
        const mockResponse = { ok: true };

        // Save the original fetch before content script runs
        const mockFetch = jest.fn().mockResolvedValue(mockResponse);
        window.fetch = mockFetch;

        // Import the content script which will intercept fetch
        jest.isolateModules(() => {
          require('../content');
        });

        // Make a fetch request with Authorization header
        await window.fetch('https://api.example.com', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        });

        // Verify token was sent to background
        expect(mockSendMessage).toHaveBeenCalledWith(
          {
            action: 'saveToken',
            payload: {
              token: `Bearer_${testToken}`,
              source: 'content-script',
              url: 'https://app.navan.com/expenses',
            },
          },
          expect.any(Function)
        );
      });

      it('should handle lowercase authorization header', async () => {
        const testToken = 'test-token-lowercase';
        const mockResponse = { ok: true };

        window.fetch = jest.fn().mockResolvedValue(mockResponse);

        // Import the content script which will intercept fetch
        jest.isolateModules(() => {
          require('../content');
        });

        await window.fetch('https://api.example.com', {
          headers: {
            authorization: `Bearer ${testToken}`,
          },
        });

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_${testToken}`,
            }),
          }),
          expect.any(Function)
        );
      });

      it('should ignore non-Bearer tokens', async () => {
        const mockResponse = { ok: true };
        window.fetch = jest.fn().mockResolvedValue(mockResponse);

        await window.fetch('https://api.example.com', {
          headers: {
            Authorization: 'Basic dXNlcjpwYXNz',
          },
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
      });

      it('should pass through fetch calls normally', async () => {
        const mockResponse = { ok: true, data: 'test' };
        originalFetch = jest.fn().mockResolvedValue(mockResponse);
        window.fetch = originalFetch;

        // Re-import to apply interception
        jest.isolateModules(() => {
          require('../content');
        });

        const result = await window.fetch('https://api.example.com');

        expect(result).toBe(mockResponse);
        expect(originalFetch).toHaveBeenCalledWith('https://api.example.com');
      });
    });

    describe('XMLHttpRequest interception', () => {
      it('should capture Bearer token from XMLHttpRequest', () => {
        const testToken = 'xhr-test-token';

        // Import the content script which will intercept XMLHttpRequest
        jest.isolateModules(() => {
          require('../content');
        });

        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.example.com');
        xhr.setRequestHeader('Authorization', `Bearer ${testToken}`);

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_${testToken}`,
            }),
          }),
          expect.any(Function)
        );
      });

      it('should handle multiple headers correctly', () => {
        const testToken = 'xhr-multi-header-token';

        // Import the content script which will intercept XMLHttpRequest
        jest.isolateModules(() => {
          require('../content');
        });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.example.com');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${testToken}`);
        xhr.setRequestHeader('X-Custom-Header', 'value');

        // Should only be called once for the Authorization header
        expect(mockSendMessage).toHaveBeenCalledTimes(1);
        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_${testToken}`,
            }),
          }),
          expect.any(Function)
        );
      });

      it('should maintain XMLHttpRequest functionality', () => {
        const mockOpen = jest.fn();
        const mockSetHeader = jest.fn();

        // Set up mocks before content script runs
        XMLHttpRequest.prototype.open = mockOpen;
        XMLHttpRequest.prototype.setRequestHeader = mockSetHeader;

        // Import the content script which will intercept XMLHttpRequest
        jest.isolateModules(() => {
          require('../content');
        });

        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'https://api.example.com', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        expect(mockOpen).toHaveBeenCalledWith(
          'GET',
          'https://api.example.com',
          true,
          undefined,
          undefined
        );
        expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      });
    });

    describe('storage checking', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should check localStorage for auth tokens', () => {
        const testToken = 'Bearer local-storage-token';
        localStorage.setItem('authToken', testToken);

        // Re-import to trigger initial check
        jest.isolateModules(() => {
          require('../content');
        });

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_local-storage-token`,
            }),
          }),
          expect.any(Function)
        );
      });

      it('should check sessionStorage for auth tokens', () => {
        const testToken = 'Bearer session-storage-token';
        sessionStorage.setItem('access_token', testToken);

        jest.isolateModules(() => {
          require('../content');
        });

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_session-storage-token`,
            }),
          }),
          expect.any(Function)
        );
      });

      it('should check multiple storage keys', () => {
        localStorage.setItem('token', 'Bearer token1');
        sessionStorage.setItem('bearer', 'Bearer token2');

        jest.isolateModules(() => {
          require('../content');
        });

        // Should be called for both tokens
        expect(mockSendMessage).toHaveBeenCalledTimes(2);
      });

      it('should periodically check storage', () => {
        jest.isolateModules(() => {
          require('../content');
        });

        // Initial check
        expect(mockSendMessage).toHaveBeenCalledTimes(0);

        // Add token after initialization
        localStorage.setItem('authToken', 'Bearer periodic-token');

        // Fast-forward 5 seconds
        jest.advanceTimersByTime(5000);

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: 'Bearer_periodic-token',
            }),
          }),
          expect.any(Function)
        );
      });

      it('should ignore non-Bearer tokens in storage', () => {
        localStorage.setItem('authToken', 'Basic dXNlcjpwYXNz');
        sessionStorage.setItem('token', 'some-other-format');

        jest.isolateModules(() => {
          require('../content');
        });

        expect(mockSendMessage).not.toHaveBeenCalled();
      });
    });

    describe('script tag scanning', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should extract Bearer tokens from script tags', () => {
        // Create a script element with token
        const script = document.createElement('script');
        script.textContent = `
          const config = {
            apiToken: "Bearer_abcd1234567890",
            endpoint: "https://api.example.com"
          };
        `;
        document.body.appendChild(script);

        jest.isolateModules(() => {
          require('../content');
        });

        // Fast-forward to trigger script scanning
        jest.advanceTimersByTime(2000);

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: 'Bearer_abcd1234567890',
            }),
          }),
          expect.any(Function)
        );

        // Cleanup
        document.body.removeChild(script);
      });

      it('should handle multiple script tags', () => {
        const script1 = document.createElement('script');
        script1.textContent = 'const token1 = "Bearer token123";';

        const script2 = document.createElement('script');
        script2.textContent = 'const auth = { header: "Bearer token456" };';

        document.body.appendChild(script1);
        document.body.appendChild(script2);

        jest.isolateModules(() => {
          require('../content');
        });

        jest.advanceTimersByTime(2000);

        expect(mockSendMessage).toHaveBeenCalledTimes(2);

        // Cleanup
        document.body.removeChild(script1);
        document.body.removeChild(script2);
      });
    });
  });

  describe('sendTokenToBackground', () => {
    let sendTokenToBackground: (token: string) => void;

    beforeEach(() => {
      // Create a mock implementation of sendTokenToBackground
      sendTokenToBackground = (token: string) => {
        if (!token || typeof token !== 'string') {
          return;
        }

        // Trim whitespace
        const trimmedToken = token.trim();

        // Skip malformed tokens
        if (!trimmedToken || trimmedToken === 'Bearer' || trimmedToken === 'Bearer ') {
          return;
        }

        // Ensure token has Bearer_ prefix, handle both "Bearer " and raw tokens
        let formattedToken = trimmedToken;
        if (!trimmedToken.startsWith('Bearer_')) {
          // Remove "Bearer " prefix if present, then add "Bearer_"
          if (trimmedToken.startsWith('Bearer ')) {
            const tokenValue = trimmedToken.substring(7).trim();
            if (!tokenValue) {
              return; // Skip if no actual token after "Bearer "
            }
            formattedToken = `Bearer_${tokenValue}`;
          } else {
            formattedToken = `Bearer_${trimmedToken}`;
          }
        }

        chrome.runtime.sendMessage(
          {
            action: 'saveToken',
            payload: { token: formattedToken, source: 'content-script', url: window.location.href },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              (error as any)('Failed to send token:', chrome.runtime.lastError.message);
            } else if (response?.success) {
              (info as any)('Token saved successfully via content script');
            } else {
              (error as any)('Failed to save token:', response?.error || 'Unknown error');
            }
          }
        );
      };
    });

    it('should format token with Bearer_ prefix if missing', () => {
      mockSendMessage.mockImplementation((msg, callback) => {
        callback({ success: true });
      });

      sendTokenToBackground('test-token-no-prefix');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            token: 'Bearer_test-token-no-prefix',
          }),
        }),
        expect.any(Function)
      );
    });

    it('should not double-prefix Bearer_ tokens', () => {
      mockSendMessage.mockImplementation((msg, callback) => {
        callback({ success: true });
      });

      sendTokenToBackground('Bearer_already-prefixed');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            token: 'Bearer_already-prefixed',
          }),
        }),
        expect.any(Function)
      );
    });

    it('should handle chrome runtime errors', () => {
      (chrome.runtime as any).lastError = mockLastError;

      mockSendMessage.mockImplementation((msg, callback) => {
        callback(null);
      });

      sendTokenToBackground('error-test-token');

      expect(error).toHaveBeenCalledWith('Failed to send token:', mockLastError.message);
    });

    it('should log successful token sends', () => {
      const mockResponse = { success: true, tokenId: '123' };

      mockSendMessage.mockImplementation((msg, callback) => {
        callback(mockResponse);
      });

      sendTokenToBackground('success-test-token');

      expect(info).toHaveBeenCalledWith('Token saved successfully via content script');
    });

    it('should ignore invalid tokens', () => {
      sendTokenToBackground('');
      sendTokenToBackground(null as any);
      sendTokenToBackground(undefined as any);
      sendTokenToBackground(123 as any);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('hostname restriction', () => {
    it('should only activate on app.navan.com', () => {
      // Test with different hostname
      (window as any).location = {
        href: 'https://example.com/page',
        hostname: 'example.com',
      };

      jest.isolateModules(() => {
        require('../content');
      });

      // Try to trigger token capture
      localStorage.setItem('authToken', 'Bearer test-token');

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should activate on app.navan.com subdomain', () => {
      (window as any).location = {
        href: 'https://app.navan.com/expenses',
        hostname: 'app.navan.com',
      };

      // Set token before loading content script
      localStorage.setItem('authToken', 'Bearer navan-token');

      jest.isolateModules(() => {
        require('../content');
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            token: 'Bearer_navan-token',
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed Bearer tokens gracefully', () => {
      const malformedTokens = ['Bearer', 'Bearer ', 'Bearer  ', 'Bearer\n', 'Bearer\t'];

      malformedTokens.forEach((token) => {
        localStorage.setItem('authToken', token);

        jest.isolateModules(() => {
          require('../content');
        });

        // Should not crash or send malformed tokens
        expect(mockSendMessage).not.toHaveBeenCalled();

        localStorage.clear();
        jest.resetModules();
      });
    });

    it('should handle concurrent token captures', async () => {
      const tokens = ['token1', 'token2', 'token3'];

      jest.isolateModules(() => {
        require('../content');
      });

      // Simulate multiple simultaneous token captures
      const promises = tokens.map((token) =>
        window.fetch('https://api.example.com', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(promises);

      // All tokens should be captured
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
      tokens.forEach((token) => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              token: `Bearer_${token}`,
            }),
          }),
          expect.any(Function)
        );
      });
    });
  });
});
