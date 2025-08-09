---
id: task-021
title: Display expense ID in Recent Expenses list and Expense Detail view
status: Done
assignee:
  - '@christopher'
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

Users need to see the expense ID directly in the UI for reference and troubleshooting purposes. Currently, the expense ID is used internally but not displayed to the user in either the Recent Expenses list or the Expense Detail view. This creates difficulties when users need to reference specific expenses or report issues.

## Acceptance Criteria

- [ ] Expense ID is visible in each expense item in the Recent Expenses list
- [ ] Expense ID is displayed as a field in the Expense Detail view
- [ ] Expense ID format is consistent across both views
- [ ] All existing tests continue to pass

## Implementation Plan

1. Locate the expense list rendering in sidepanel-ui.ts\n2. Add expense ID display to each expense item in the list\n3. Locate the expense detail view rendering\n4. Add expense ID as a field in the detail view\n5. Ensure consistent formatting (e.g., 'ID: XXXX' or just the ID)\n6. Test the changes visually and ensure no layout issues

## Implementation Notes

Added expense ID display to both the Recent Expenses list and Expense Detail view. In the list view, the ID appears below the expense details with 'ID: ' prefix in a monospace font. In the detail view, the ID is prominently displayed at the top of the details section. Also added expense ID to the default fields in FieldConfigurationService. Styled both displays consistently with monospace font for easy reading and copying. All tests pass and build succeeds.
