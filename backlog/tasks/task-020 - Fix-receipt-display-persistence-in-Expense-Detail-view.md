---
id: task-020
title: Fix receipt display persistence in Expense Detail view
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

When viewing Expense Detail, receipts should be displayed consistently regardless of how the user navigated to the detail view. Currently, receipts are only shown immediately after upload but disappear when reopening the extension or navigating to an expense through other means. The application needs to fetch and display existing receipts from the API whenever an expense detail is viewed.

## Acceptance Criteria

- [x] Receipts are displayed when opening an expense that has existing receipts
- [x] Receipts remain visible after closing and reopening the extension
- [x] Receipts are fetched from the API when viewing expense detail
- [x] Receipt display behavior is consistent regardless of navigation method
- [x] All existing functionality for uploading and deleting receipts continues to work

## Implementation Plan

1. Analyze the current expense detail component to understand how receipts are displayed\n2. Identify where receipts should be fetched from the API when viewing expense detail\n3. Ensure receipts are fetched whenever an expense detail view is opened\n4. Verify that receipt state is properly managed and persisted\n5. Test receipt display persistence across different navigation scenarios

## Implementation Notes

### Approach Taken
Implemented receipt fetching when viewing expense details by calling the fetchExpense API endpoint to retrieve the full expense data including receipt information.

### Features Implemented
- Added API call to fetch full expense details when viewing an expense
- Modified showExpenseDetail method in sidepanel-ui.ts to fetch complete expense data
- Updated initializeReceiptUpload to use full expense data for displaying existing receipts
- Enhanced message adapter to support both selectedTxn.id and direct payload.expenseId formats

### Technical Decisions and Trade-offs
- Chose to fetch full expense details on every detail view to ensure receipts are always current
- Used the existing fetchExpense handler which was already implemented but not being called
- Maintained backward compatibility with existing message formats while adding new payload support

### Modified Files
- src/chrome/sidepanel-ui.ts - Added full expense fetching and updated receipt initialization
- src/chrome/message-adapter.ts - Enhanced to support direct payload.expenseId format
