---
id: task-088
title: Update Status filter to only show Approved and Submitted options
status: To Do
assignee: []
created_date: '2025-08-12'
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
