/**
 * Content script for capturing authentication tokens from Navan
 * Monitors network requests and extracts authorization headers
 */

import { error, info } from '../shared/services/logger/chrome-logger-setup';

info('Expense automation content script initialized on:', window.location.href);

// Function to extract token from various sources
function captureAuthToken() {
  // Method 1: Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [_resource, config] = args;

    // Check if request has Authorization header
    if (config && config.headers) {
      const headers = config.headers as Record<string, string>;
      const authHeader = headers['Authorization'] || headers['authorization'];

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        info('Captured auth token from fetch request');
        sendTokenToBackground(token);
      }
    }

    // Call original fetch
    return originalFetch.apply(this, args);
  };

  // Method 2: Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // Store headers on a WeakMap to avoid modifying the prototype
  const xhrHeaders = new WeakMap<XMLHttpRequest, Record<string, string>>();

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    xhrHeaders.set(this, {});
    return originalOpen.call(
      this,
      method,
      url,
      async !== undefined ? async : true,
      username,
      password
    );
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string) {
    const headers = xhrHeaders.get(this) || {};
    headers[header] = value;
    xhrHeaders.set(this, headers);

    if (header.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
      const token = value.replace('Bearer ', '');
      info('Captured auth token from XMLHttpRequest');
      sendTokenToBackground(token);
    }

    return originalSetRequestHeader.call(this, header, value);
  };

  // Method 3: Check localStorage and sessionStorage periodically
  const checkStorage = () => {
    // Common keys that might contain auth tokens
    const possibleKeys = [
      'authToken',
      'auth_token',
      'token',
      'access_token',
      'bearer',
      'authorization',
    ];

    for (const key of possibleKeys) {
      const localValue = localStorage.getItem(key);
      const sessionValue = sessionStorage.getItem(key);

      if (localValue && localValue.startsWith('Bearer')) {
        info('Found token in localStorage:', key);
        sendTokenToBackground(localValue);
      }

      if (sessionValue && sessionValue.startsWith('Bearer')) {
        info('Found token in sessionStorage:', key);
        sendTokenToBackground(sessionValue);
      }
    }
  };

  // Check storage on load and periodically
  checkStorage();
  setInterval(checkStorage, 5000); // Check every 5 seconds
}

// Send captured token to background script
function sendTokenToBackground(token: string) {
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
      payload: {
        token: formattedToken,
        source: 'content-script',
        url: window.location.href,
      },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        error('Failed to send token:', chrome.runtime.lastError);
      } else {
        info('Token sent to background:', response);
      }
    }
  );
}

// Initialize token capture
if (window.location.hostname === 'app.navan.com') {
  captureAuthToken();

  // Also try to capture token from any existing API calls on page load
  setTimeout(() => {
    // Look for token in the page's JavaScript context
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      const content = script.textContent || '';
      const tokenMatch = content.match(/Bearer[_\s]+([a-zA-Z0-9\-_]+)/);
      if (tokenMatch && tokenMatch[1]) {
        info('Found token in script tag');
        sendTokenToBackground(`Bearer_${tokenMatch[1]}`);
      }
    });
  }, 2000);
}
