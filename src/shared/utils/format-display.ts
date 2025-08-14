/**
 * Formats a snake_case string to Title Case for display
 * @param value - The snake_case string to format (e.g., 'miscellaneous_food_stores')
 * @returns The formatted Title Case string (e.g., 'Miscellaneous Food Stores')
 */
export function formatCategoryDisplay(value: string | undefined | null): string {
  if (!value) {
    return 'Uncategorized';
  }

  // Convert snake_case to Title Case
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
