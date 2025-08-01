import { DefaultTokenValidator, TripActionsTokenValidator } from '../token-validator';

describe('TokenValidators', () => {
  describe('DefaultTokenValidator', () => {
    it('should validate tokens with default settings', () => {
      const validator = new DefaultTokenValidator();

      expect(validator.validate('Bearer_12345678901234567890')).toBe(true);
      expect(validator.validate('Bearer_short')).toBe(false);
      expect(validator.validate('Invalid_12345678901234567890')).toBe(false);
      expect(validator.validate('')).toBe(false);
      expect(validator.validate(null as any)).toBe(false);
      expect(validator.validate(undefined as any)).toBe(false);
    });

    it('should use custom prefix and length', () => {
      const validator = new DefaultTokenValidator('Custom', 10);

      expect(validator.getPrefix()).toBe('Custom');
      expect(validator.getMinLength()).toBe(10);
      expect(validator.validate('Custom_1234567890')).toBe(true);
      expect(validator.validate('Custom_12')).toBe(false); // Only 9 chars
      expect(validator.validate('Bearer_1234567890')).toBe(false);
    });
  });

  describe('TripActionsTokenValidator', () => {
    const validator = new TripActionsTokenValidator();

    it('should validate TripActions tokens', () => {
      const validToken = 'TripActions_1234567890abcdefghijklmnopqrstuvwxyz1234567890';
      expect(validator.validate(validToken)).toBe(true);
    });

    it('should reject tokens without TripActions prefix', () => {
      const invalidTokens = [
        'Bearer_1234567890abcdefghijklmnopqrstuvwxyz1234567890',
        'Invalid_1234567890abcdefghijklmnopqrstuvwxyz1234567890',
        'tripactions_1234567890abcdefghijklmnopqrstuvwxyz1234567890', // wrong case
      ];

      invalidTokens.forEach((token) => {
        expect(validator.validate(token)).toBe(false);
      });
    });

    it('should reject tokens shorter than 50 characters', () => {
      const shortTokens = [
        'TripActions_',
        'TripActions_123',
        'TripActions_12345678901234567890', // < 50 chars
      ];

      shortTokens.forEach((token) => {
        expect(validator.validate(token)).toBe(false);
      });
    });

    it('should handle invalid inputs', () => {
      expect(validator.validate('')).toBe(false);
      expect(validator.validate(null as any)).toBe(false);
      expect(validator.validate(undefined as any)).toBe(false);
      expect(validator.validate(123 as any)).toBe(false);
      expect(validator.validate({} as any)).toBe(false);
    });

    it('should have correct prefix and min length', () => {
      expect(validator.getPrefix()).toBe('TripActions');
      expect(validator.getMinLength()).toBe(50);
    });
  });
});
