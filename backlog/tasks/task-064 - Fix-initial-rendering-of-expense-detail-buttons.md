---
id: task-064
title: Fix initial rendering of expense detail buttons
status: To Do
assignee: []
created_date: '2025-08-08'
labels: []
dependencies: []
---

## Description

The 'Open in Navan' hyperlink and 'Customize Display' button in the expense detail view appear unstyled when first rendered, showing as bare HTML elements. The proper styles only get applied after certain user interactions trigger the modal styles injection. This creates a poor user experience with buttons that appear broken or incomplete initially, then suddenly become styled properly. The buttons should render with their intended styling immediately when the expense detail view is displayed.

## Acceptance Criteria

- [ ] Buttons render with correct styling immediately on expense detail view load
- [ ] No unstyled button flash on initial render
- [ ] Style injection happens before elements are displayed
- [ ] Buttons maintain consistent appearance throughout user session
- [ ] CSS styles are properly scoped to avoid conflicts
- [ ] Dark mode theme compatibility is preserved
- [ ] All existing button functionality remains unchanged
