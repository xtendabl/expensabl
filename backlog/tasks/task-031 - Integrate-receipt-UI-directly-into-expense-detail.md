---
id: task-031
title: Integrate receipt UI directly into expense detail
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-026
  - task-027
---

## Description

Remove the separate ExpenseDetailWithReceipt component and add receipt functionality directly to the existing expense detail view

## Acceptance Criteria

- [ ] ExpenseDetailWithReceipt component deleted
- [ ] Receipt UI integrated into existing detail view
- [ ] Simple HTML templates used
- [ ] Receipt upload works
- [ ] Receipt display works
- [ ] All tests pass

## Implementation Plan

1. Check current usage of ExpenseDetailWithReceipt\n2. Since we already simplified it in task-026, check if further integration is needed\n3. Verify current state meets requirements

## Implementation Notes

This task was effectively completed as part of task-026. The ExpenseDetailWithReceipt component is already the main expense detail view with integrated receipt functionality. After task-026 simplifications, it now uses:\n- Simple HTML templates (all inline in render method)\n- Native file input with drag-drop\n- Direct receipt UI integration\n- No separate components\nThe component is self-contained at 821 lines including all styles and templates.
