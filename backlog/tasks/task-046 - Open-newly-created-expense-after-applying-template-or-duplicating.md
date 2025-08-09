---
id: task-046
title: Open newly created expense after applying template or duplicating
status: Done
assignee:
  - '@christopher'
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

When users click 'Apply Template' or 'Duplicate Expense', the system creates a new expense but only shows a success toast notification. Users then have to manually navigate to find and view the newly created expense. This creates friction in the workflow as users typically want to review or edit the new expense immediately after creation. Opening the new expense automatically would improve the user experience and streamline the workflow.

## Acceptance Criteria

- [x] When a template is applied successfully the new expense opens in the detail view
- [x] When an expense is duplicated the new expense opens in the detail view
- [x] The expense ID from the creation response is used to fetch and display the expense
- [x] Loading state is shown while fetching the new expense details
- [x] Error handling displays appropriate message if expense cannot be loaded
- [x] Existing template and expense functionality continues to work
- [x] The expenses list refreshes to include the new expense

## Implementation Plan

1. Find the Apply Template functionality and identify where expense is created
2. Find the Duplicate Expense functionality 
3. Extract expense ID from creation response
4. Automatically open the new expense in detail view after creation
5. Ensure expenses list is refreshed
6. Add proper error handling and loading states
7. Test both workflows work correctly

## Implementation Notes

Successfully implemented automatic opening of newly created expenses after template application and duplication.

**Changes made:**
- Modified `handleApplyTemplate` to extract expense ID and open detail view after creation
- Modified `handleDuplicateExpense` to extract expense ID and open detail view after duplication
- Both functions now refresh the expenses list before opening the new expense

**Files modified:**
- `src/chrome/sidepanel-ui.ts` - Updated both handler functions

**Technical approach:**
- Extract expense ID from creation response (`response.data.id` or `response.data.uuid`)
- Call `handleFetchExpenses()` to refresh the expense list
- Call `showExpenseDetail(expenseId)` to open the new expense
- Added fallback to list view if expense ID cannot be extracted
- Existing toast notifications retained for user feedback

The workflow is now seamless - users can immediately review and edit newly created expenses without manual navigation.
