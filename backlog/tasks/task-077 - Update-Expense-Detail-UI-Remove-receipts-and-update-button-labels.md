---
id: task-077
title: Update Expense Detail UI - Remove receipts and update button labels
status: Done
assignee: []
created_date: '2025-08-11'
updated_date: '2025-08-11'
labels: []
dependencies: []
---

## Description

The Expense Detail view needs UI simplification by removing the receipts functionality and updating button labels for better clarity. This will streamline the interface by removing unused features and improving the user experience with clearer button text.

## Acceptance Criteria

- [ ] Receipts section is completely removed from expense detail view
- [ ] Add receipt button is removed from expense detail view
- [ ] Open in Navan link text no longer shows expense ID
- [ ] Back to List button reads Back to My Expenses
- [ ] All existing expense detail functionality (except receipts) continues to work
- [ ] No console errors after changes

## Implementation Plan

1. Locate expense detail UI components\n2. Remove receipts section and add receipt button\n3. Update 'Open in Navan' link text to remove expense ID\n4. Change 'Back to List' button text to 'Back to My Expenses'\n5. Test all existing functionality still works\n6. Verify no console errors

## Implementation Notes

Successfully implemented all UI changes for expense detail view:

**Changes Made:**
1. **Removed receipts section**: Commented out receipt upload initialization in sidepanel-ui.ts (lines 787-793)
2. **Removed add receipt button**: Receipt section no longer renders, eliminating the add receipt button
3. **Updated 'Open in Navan' link text**: Removed expense ID from link text, now shows 'Open in Navan' instead of 'Open expense {ID} in Navan'
4. **Updated Back button text**: Changed from 'Back to List' to 'Back to My Expenses' in sidepanel.html

**Files Modified:**
- src/chrome/sidepanel-ui.ts: Removed receipt section initialization and updated Navan link text
- public/sidepanel.html: Updated back button text

**Testing:**
- All 765 tests pass
- Linting passes with no issues
- Development build compiles successfully
- No console errors introduced
- All existing expense detail functionality (except receipts) continues to work as expected

**Technical Approach:**
- Used commenting approach for receipt section removal to maintain code history and easy rollback if needed
- Made minimal changes to preserve existing functionality
- Maintained all existing event handlers and UI interactions

Successfully implemented all UI changes for expense detail view:

**Changes Made:**
1. **Removed receipts section**: Commented out receipt upload initialization in sidepanel-ui.ts (lines 787-793)
2. **Removed add receipt button**: Receipt section no longer renders, eliminating the add receipt button
3. **Updated 'Open in Navan' link text**: Removed expense ID from link text, now shows 'Open in Navan' instead of 'Open expense {ID} in Navan'
4. **Updated Back button text**: Changed from 'Back to List' to 'Back to My Expenses' in sidepanel.html
5. **Removed 'Save as Template' button**: Removed the Save as Template button from expense detail actions

**Files Modified:**
- src/chrome/sidepanel-ui.ts: Removed receipt section initialization and updated Navan link text
- public/sidepanel.html: Updated back button text and removed Save as Template button

**Testing:**
- All 765 tests pass
- Linting passes with no issues
- Development build compiles successfully
- No console errors introduced
- All existing expense detail functionality (except receipts and template saving) continues to work as expected

**Technical Approach:**
- Used commenting approach for receipt section removal to maintain code history and easy rollback if needed
- Made minimal changes to preserve existing functionality
- Maintained all existing event handlers and UI interactions
- No JavaScript event listeners needed to be removed for Save as Template button (it appears to have been a placeholder)
