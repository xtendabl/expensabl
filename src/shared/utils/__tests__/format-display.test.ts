import { formatCategoryDisplay } from '../format-display';

describe('formatCategoryDisplay', () => {
  describe('snake_case to Title Case conversion', () => {
    it('should convert single word snake_case to Title Case', () => {
      expect(formatCategoryDisplay('restaurants')).toBe('Restaurants');
      expect(formatCategoryDisplay('hotels')).toBe('Hotels');
      expect(formatCategoryDisplay('airlines')).toBe('Airlines');
    });

    it('should convert multi-word snake_case to Title Case', () => {
      expect(formatCategoryDisplay('miscellaneous_food_stores')).toBe('Miscellaneous Food Stores');
      expect(formatCategoryDisplay('computer_software_stores')).toBe('Computer Software Stores');
      expect(formatCategoryDisplay('business_services')).toBe('Business Services');
      expect(formatCategoryDisplay('car_rental_agencies')).toBe('Car Rental Agencies');
    });

    it('should handle all uppercase words correctly', () => {
      expect(formatCategoryDisplay('RESTAURANTS')).toBe('Restaurants');
      expect(formatCategoryDisplay('MISCELLANEOUS_FOOD_STORES')).toBe('Miscellaneous Food Stores');
    });

    it('should handle mixed case input', () => {
      expect(formatCategoryDisplay('MiScElLaNeOuS_FoOd_StOrEs')).toBe('Miscellaneous Food Stores');
    });
  });

  describe('edge cases', () => {
    it('should return "Uncategorized" for null', () => {
      expect(formatCategoryDisplay(null)).toBe('Uncategorized');
    });

    it('should return "Uncategorized" for undefined', () => {
      expect(formatCategoryDisplay(undefined)).toBe('Uncategorized');
    });

    it('should return "Uncategorized" for empty string', () => {
      expect(formatCategoryDisplay('')).toBe('Uncategorized');
    });

    it('should handle single character strings', () => {
      expect(formatCategoryDisplay('a')).toBe('A');
      expect(formatCategoryDisplay('z')).toBe('Z');
    });

    it('should handle strings with numbers', () => {
      expect(formatCategoryDisplay('category_123')).toBe('Category 123');
      expect(formatCategoryDisplay('123_category')).toBe('123 Category');
    });

    it('should handle strings with multiple consecutive underscores', () => {
      expect(formatCategoryDisplay('category__name')).toBe('Category  Name');
    });
  });

  describe('common Navan categories', () => {
    it('should format common Navan expense categories correctly', () => {
      // Based on typical Navan category patterns
      expect(formatCategoryDisplay('airlines')).toBe('Airlines');
      expect(formatCategoryDisplay('hotels_motels')).toBe('Hotels Motels');
      expect(formatCategoryDisplay('car_rental_agencies')).toBe('Car Rental Agencies');
      expect(formatCategoryDisplay('restaurants')).toBe('Restaurants');
      expect(formatCategoryDisplay('taxi_limousines')).toBe('Taxi Limousines');
      expect(formatCategoryDisplay('business_services')).toBe('Business Services');
      expect(formatCategoryDisplay('miscellaneous_food_stores')).toBe('Miscellaneous Food Stores');
      expect(formatCategoryDisplay('computer_software_stores')).toBe('Computer Software Stores');
      expect(formatCategoryDisplay('telecommunication_services')).toBe('Telecommunication Services');
      expect(formatCategoryDisplay('office_supplies')).toBe('Office Supplies');
    });
  });
});