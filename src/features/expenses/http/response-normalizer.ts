import { NavanExpenseData, ExpenseListResponse } from '../types';

export interface ResponseStructureAnalysis {
  type: string;
  length?: number;
  keyCount?: number;
  keys?: string[];
  hasDataArray?: boolean;
  dataArrayLength?: number;
  firstItemType?: string;
  firstItemKeys?: string[];
  value?: unknown;
}

export class ResponseNormalizer {
  normalizeExpenseListResponse(response: unknown): ExpenseListResponse {
    // Format 1: Expected {data: [...]} structure
    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray((response as Record<string, unknown>).data)
    ) {
      return response as ExpenseListResponse;
    }

    // Format 2: HAL format with {_embedded: {transactions: [...]}}
    if (
      response &&
      typeof response === 'object' &&
      '_embedded' in response &&
      typeof (response as Record<string, unknown>)._embedded === 'object' &&
      (response as Record<string, unknown>)._embedded !== null &&
      'transactions' in
        ((response as Record<string, unknown>)._embedded as Record<string, unknown>) &&
      Array.isArray(
        ((response as Record<string, unknown>)._embedded as Record<string, unknown>).transactions
      )
    ) {
      const transactions = (
        (response as Record<string, unknown>)._embedded as Record<string, unknown>
      ).transactions as NavanExpenseData[];
      return { data: transactions };
    }

    // Format 3: Direct array response
    if (Array.isArray(response)) {
      return { data: response as NavanExpenseData[] };
    }

    // Format 4: Unknown/unsupported format - return empty
    return { data: [] };
  }

  analyzeResponseStructure(data: unknown): ResponseStructureAnalysis {
    if (data === null) {
      return { type: 'null' };
    }

    if (data === undefined) {
      return { type: 'undefined' };
    }

    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        firstItemType: data.length > 0 ? typeof data[0] : 'empty',
        firstItemKeys:
          data.length > 0 && typeof data[0] === 'object' && data[0] !== null
            ? Object.keys(data[0]).slice(0, 10)
            : undefined,
      };
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return {
        type: 'object',
        keyCount: keys.length,
        keys: keys.slice(0, 20),
        hasDataArray: 'data' in data && Array.isArray((data as Record<string, unknown>).data),
        dataArrayLength:
          'data' in data && Array.isArray((data as Record<string, unknown>).data)
            ? ((data as Record<string, unknown>).data as unknown[]).length
            : undefined,
      };
    }

    return {
      type: typeof data,
      value: typeof data === 'string' ? this.truncateForLogging(data, 100) : data,
    };
  }

  truncateForLogging(data: unknown, maxLength: number = 2000): unknown {
    if (typeof data === 'string') {
      return data.length > maxLength
        ? `${data.substring(0, maxLength)}... [truncated, total length: ${data.length}]`
        : data;
    }

    if (typeof data === 'object' && data !== null) {
      const stringified = JSON.stringify(data);
      return stringified.length > maxLength
        ? `${stringified.substring(0, maxLength)}... [truncated, total length: ${stringified.length}]`
        : data;
    }

    return data;
  }
}
