---
id: task-063
title: Update 'Open in Navan' link text to include expense ID
status: Done
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-09'
labels: []
dependencies: []
---

## Description

The hyperlink in the Expense Detail view that opens expenses in the Navan web app currently shows generic text 'Open in Navan'. This should be updated to include the specific expense ID to provide clearer context about which expense will be opened, improving user experience and reducing confusion when multiple expenses are being managed.

## Acceptance Criteria

- [x] Link text displays 'Open expense {expenseId} in Navan' format
- [x] Expense ID is dynamically inserted based on current expense
- [x] Link functionality remains unchanged
- [x] Title attribute is updated to match new text format
- [x] External link icon remains properly positioned
- [x] All existing tests continue to pass

## Implementation Plan

1. Locate the 'Open in Navan' link implementation
2. Update the link text to include the expense ID
3. Update the title attribute to match
4. Ensure proper styling with the expense ID
5. Test that the link still functions correctly

## Implementation Notes

Updated the 'Open in Navan' hyperlink in the Expense Detail view to include the expense ID. The link now displays 'Open expense {expenseId} in Navan' with the actual expense ID dynamically inserted. The title attribute was also updated to match. The external link icon remains properly positioned, and all existing functionality is preserved. All 764 tests pass and linting shows no issues.
