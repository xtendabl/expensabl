---
id: task-075
title: Remove Help & Getting Started Accordion Section from Sidepanel UI
status: To Do
assignee: []
created_date: '2025-08-10'
updated_date: '2025-08-11'
labels:
  - cleanup
dependencies: []
---

## Description

The sidepanel currently displays a collapsible 'Help & Getting Started' section that should be removed from the user interface. This is a UI-only change - help content and documentation can remain available through other means if needed.

## Acceptance Criteria

- [ ] Help & Getting Started accordion section is completely removed from sidepanel HTML
- [ ] Help-related UI event listeners in sidepanel-ui.ts are removed
- [ ] Help-related UI state and methods in sidepanel-ui.ts are cleaned up
- [ ] No console errors occur when loading the sidepanel
- [ ] All existing tests continue to pass
- [ ] Other sidepanel sections (Expenses) continue to function normally
- [ ] Help documentation remains accessible via other channels if needed
