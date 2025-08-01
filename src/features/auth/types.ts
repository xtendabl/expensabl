/**
 * Authentication types and interfaces
 */

/**
 * Token data structure for storage
 */
export interface TokenData {
  token: string;
  source: string;
  capturedAt: number;
  expiresAt?: number;
  lastUsed?: number;
}

/**
 * Authentication status enumeration
 */
export enum AuthStatus {
  AUTHENTICATED = 'authenticated',
  NOT_AUTHENTICATED = 'not_authenticated',
  EXPIRED = 'expired',
  INVALID = 'invalid',
}

/**
 * Token metadata for storage operations
 */
export interface TokenMetadata {
  source: string;
  expiresAt?: number;
}

/**
 * Token validator interface
 */
export interface TokenValidator {
  validate(token: string): boolean;
  getPrefix(): string;
  getMinLength(): number;
}
