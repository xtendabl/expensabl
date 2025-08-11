---
id: task-074
title: Remove Settings Accordion Section from Sidepanel UI
status: To Do
assignee: []
created_date: '2025-08-10'
updated_date: '2025-08-11'
labels:
  - cleanup
dependencies: []
---

## Description

The sidepanel currently displays a collapsible 'Settings' section that should be removed from the user interface. This is a UI-only change - any backend settings functionality should remain intact for potential future use or API access.

## Acceptance Criteria

- [ ] Settings accordion section is completely removed from sidepanel HTML
- [ ] Settings-related UI event listeners in sidepanel-ui.ts are removed
- [ ] Settings-related UI state and methods in sidepanel-ui.ts are cleaned up
- [ ] No console errors occur when loading the sidepanel
- [ ] All existing tests continue to pass
- [ ] Other sidepanel sections (Expenses) continue to function normally
- [ ] User preferences stored in chrome.storage remain intact and accessible
