---
id: task-069
title: Fix modal positioning in sidepanel - modals appear in top-left corner
status: To Do
assignee: []
created_date: '2025-08-09'
labels: []
dependencies: []
---

## Description

Workflow modals (Duplicate Expense, Amount Modification, Receipt Selection) are appearing in the top-left corner of the sidepanel instead of being properly centered. This occurs because the modal.css styles are not being loaded in the sidepanel context, causing modals to lose their positioning styles. This creates a poor user experience and makes the modals difficult to interact with.

## Acceptance Criteria

- [ ] All modals appear centered in the viewport
- [ ] Modal backdrop properly covers the entire sidepanel
- [ ] Modals maintain correct z-index layering above other UI elements
- [ ] Modal positioning works consistently across all workflow steps
- [ ] No visual regressions in existing UI components
- [ ] Modal styles are properly loaded in sidepanel context
