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
    const url = `${this.config.baseUrl}${path}`;
    return url;
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
    const finalUrl = queryString ? `${url}?${queryString}` : url;
    return finalUrl;
  }

  buildHeaders(token: string, additionalHeaders: HeadersInit = {}): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en',
      authorization: token,
      'x-timezone': this.config.defaultTimezone,
      // Removed x-request-id header as it causes CORS issues with Navan API
      // The header is not allowed by Access-Control-Allow-Headers in preflight response
    };

    return { ...baseHeaders, ...(additionalHeaders as Record<string, string>) };
  }

  buildFetchOptions(method: HttpMethod, options: RequestOptions, token: string): RequestInit {
    const { body, headers = {}, timeout = this.config.timeout } = options;

    // Detect FormData automatically - don't set Content-Type for FormData (browser will set it with boundary)
    const isFormData = body instanceof FormData;
    const requestHeaders = isFormData
      ? this.buildHeaders(token, headers)
      : {
          ...this.buildHeaders(token, headers),
          ...(this.canHaveBody(method) &&
            body !== undefined && { 'content-type': 'application/json' }),
        };

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (this.canHaveBody(method) && body !== undefined) {
      // For FormData, pass directly; otherwise JSON stringify
      fetchOptions.body = isFormData ? (body as BodyInit) : JSON.stringify(body);
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
