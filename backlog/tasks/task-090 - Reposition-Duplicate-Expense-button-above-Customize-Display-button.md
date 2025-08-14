---
id: task-090
title: Reposition Duplicate Expense button above Customize Display button
status: Done
assignee: []
created_date: '2025-08-14'
updated_date: '2025-08-14'
labels: []
dependencies: []
---

## Description

The Duplicate Expense button is currently positioned separately in the detail-actions div at the bottom of the expense detail view. For better UI consistency and user experience, it should be positioned right above the Customize Display button within the expense detail header area. This will group related action buttons together and improve the visual hierarchy of the expense detail view.

## Acceptance Criteria

- [ ] Duplicate Expense button appears directly above the Customize Display button in the expense detail view
- [ ] Both buttons maintain their existing functionality and event handlers
- [ ] Button styling remains consistent with current design
- [ ] No visual regression or layout issues in the expense detail view
- [ ] All existing tests continue to pass

## Implementation Plan

1. Locate the current Duplicate Expense button implementation in the expense detail view\n2. Find the Customize Display button location\n3. Move the Duplicate Expense button to be positioned above the Customize Display button\n4. Ensure both buttons maintain their functionality and styling\n5. Test the changes to verify no regressions\n6. Run existing tests to ensure they still pass

## Implementation Notes

Successfully repositioned the Duplicate Expense button to appear above the Customize Display button in the expense detail view header area. Changes made:\n\n1. Removed the duplicate button from the static HTML detail-actions div in public/sidepanel.html\n2. Added the duplicate button dynamically to the detail-header div in src/chrome/sidepanel-ui.ts, positioned above the Customize Display button\n3. Created a new header-buttons container with proper CSS styling for button layout\n4. Added event listener for the duplicate button in the expense detail view to maintain functionality\n5. Verified all existing tests pass and the build completes successfully\n\nThe button now appears in the header area with proper styling and maintains all existing functionality while improving the UI hierarchy and user experience.
