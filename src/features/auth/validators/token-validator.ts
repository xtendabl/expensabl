import { TokenValidator } from '../types';

/**
 * Default token validator implementation
 * Can be extended or replaced for different token formats
 */
export class DefaultTokenValidator implements TokenValidator {
  constructor(
    private readonly prefix: string = 'Bearer',
    private readonly minLength: number = 20
  ) {}

  validate(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    return token.startsWith(this.prefix) && token.length >= this.minLength;
  }

  getPrefix(): string {
    return this.prefix;
  }

  getMinLength(): number {
    return this.minLength;
  }
}

/**
 * TripActions-specific token validator
 */
export class TripActionsTokenValidator implements TokenValidator {
  private readonly prefix = 'TripActions';
  private readonly minLength = 50;

  validate(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    return token.startsWith(this.prefix) && token.length >= this.minLength;
  }

  getPrefix(): string {
    return this.prefix;
  }

  getMinLength(): number {
    return this.minLength;
  }
}
