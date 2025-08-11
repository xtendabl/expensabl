---
id: task-073
title: Remove Expense Template Accordion Section from Sidepanel UI
status: To Do
assignee: []
created_date: '2025-08-10'
updated_date: '2025-08-11'
labels:
  - cleanup
dependencies: []
---

## Description

The sidepanel currently displays a collapsible 'Expense Templates' section that should be removed from the user interface. This is a UI-only change - the backend template functionality and message handlers should remain intact for potential future use or other consumers.

## Acceptance Criteria

- [ ] Templates accordion section is completely removed from sidepanel HTML
- [ ] Template-related UI event listeners in sidepanel-ui.ts are removed
- [ ] Template-related UI state and methods in sidepanel-ui.ts are cleaned up
- [ ] No console errors occur when loading the sidepanel
- [ ] All existing tests continue to pass
- [ ] Other sidepanel sections (Expenses
- [ ] Settings
- [ ] Help) continue to function normally
