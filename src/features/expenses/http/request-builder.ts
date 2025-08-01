import { ApiConfig } from '../config/api-config';
import { HttpMethod } from '../../../shared/types/common';

export interface RequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  timeout?: number;
}

export class RequestBuilder {
  private static readonly METHODS_WITH_BODY = new Set([
    HttpMethod.POST,
    HttpMethod.PUT,
    HttpMethod.PATCH,
  ]);

  constructor(private config: ApiConfig) {}

  buildUrl(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }

  buildUrlWithParams(path: string, params?: Record<string, unknown>): string {
    const url = this.buildUrl(path);
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  buildHeaders(token: string, additionalHeaders: HeadersInit = {}): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en',
      authorization: token,
      'x-timezone': this.config.defaultTimezone,
      'x-request-id': `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    return { ...baseHeaders, ...(additionalHeaders as Record<string, string>) };
  }

  buildFetchOptions(method: HttpMethod, options: RequestOptions, token: string): RequestInit {
    const { body, headers = {}, timeout = this.config.timeout } = options;

    const requestHeaders = {
      ...this.buildHeaders(token, headers),
      ...(this.canHaveBody(method) && body !== undefined && { 'content-type': 'application/json' }),
    };

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (this.canHaveBody(method) && body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    return fetchOptions;
  }

  private canHaveBody(method: HttpMethod): boolean {
    return RequestBuilder.METHODS_WITH_BODY.has(method);
  }

  sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
