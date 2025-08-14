---
id: task-088
title: Update Status filter to only show Approved and Submitted options
status: Done
assignee:
  - '@christopher'
created_date: '2025-08-12'
updated_date: '2025-08-12'
labels: []
dependencies: []
---

## Description

The Status filter dropdown in the expense search interface currently displays 5 status options (Approved, Submitted, Pending, Rejected, Flagged). This should be simplified to only show Approved and Submitted status options to streamline the user experience and focus on the most commonly used status values.

## Acceptance Criteria

- [ ] Status filter dropdown only contains 'All Status', 'Approved', and 'Submitted' options
- [ ] Filtering by 'Approved' status correctly filters expenses to show only approved ones
- [ ] Filtering by 'Submitted' status correctly filters expenses to show only submitted ones
- [ ] 'All Status' option continues to show all expenses regardless of status
- [ ] Existing filtering logic continues to work with the reduced options
- [ ] No console errors or warnings when using the status filter
- [ ] All existing tests continue to pass

## Implementation Plan

1. Locate the status filter implementation in the codebase\n2. Find where status options are defined (likely in constants or types)\n3. Update the status options to only include 'All Status', 'Approved', and 'Submitted'\n4. Verify filtering logic still works correctly\n5. Run tests to ensure no regressions\n6. Test the UI to confirm the changes work as expected

## Implementation Notes

Updated the status filter dropdown in the expense search interface to only show 'All Status', 'Approved', and 'Submitted' options. Removed 'Pending', 'Rejected', and 'Flagged' options from the HTML select element in public/sidepanel.html. The filtering logic continues to work correctly with the reduced options. All tests pass and the build completes successfully with no errors or warnings.
