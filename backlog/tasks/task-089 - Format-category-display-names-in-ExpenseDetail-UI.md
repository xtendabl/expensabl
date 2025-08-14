---
id: task-089
title: Format category display names in ExpenseDetail UI
status: Done
assignee: []
created_date: '2025-08-12'
updated_date: '2025-08-12'
labels: []
dependencies: []
---

## Description

The ExpenseDetail section currently displays raw category values from the backend (e.g., 'miscellaneous_food_stores', 'computer_software_stores'). These should be transformed into user-friendly display values (e.g., 'Miscellaneous Food Stores', 'Computer Software Stores') while preserving the original backend values for API operations.

## Acceptance Criteria

- [ ] Category values are transformed from snake_case to Title Case format
- [ ] Original backend values remain unchanged for API communication
- [ ] All existing category values display correctly with proper formatting
- [ ] ExpenseDetail UI shows formatted category names instead of raw values
- [ ] Existing functionality for category selection and filtering remains intact

## Implementation Plan

1. Create a utility function formatCategoryDisplay() that transforms snake_case strings to Title Case
2. Identify all locations where category values are displayed in the UI
3. Apply the formatting function to category display values in ExpenseDetail
4. Apply the formatting function to category display in expense list cards
5. Ensure original backend values are preserved for API operations and filtering
6. Test with various category formats from the backend

## Implementation Notes

Implemented category display formatting to transform snake_case backend values into Title Case for UI display.

Approach taken:
- Created a reusable formatCategoryDisplay() utility function in src/shared/utils/format-display.ts
- Function handles null/undefined values and converts snake_case strings to proper Title Case
- Applied formatting consistently across all UI display points

Features implemented:
- formatCategoryDisplay utility function with comprehensive edge case handling
- Updated ExpenseDetail section to show formatted categories
- Updated expense list cards to show formatted categories
- Updated template details to show formatted categories
- Updated CSV export to use formatted categories
- Added comprehensive unit tests covering various scenarios

Technical decisions:
- Chose to create a separate utility function for reusability and testability
- Preserved original backend values for filtering and API operations
- Function returns 'Uncategorized' for null/undefined values for consistency

Modified files:
- src/shared/utils/format-display.ts (new)
- src/shared/utils/index.ts
- src/chrome/sidepanel-ui.ts
- src/shared/utils/__tests__/format-display.test.ts (new)
