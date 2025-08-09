---
id: task-036
title: Remove duplicate fileToArrayBuffer function
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-035
---

## Description

The fileToArrayBuffer function is duplicated in expense-detail-with-receipt.ts when an identical utility already exists in binary-encoding.ts. This duplication should be removed to maintain DRY principles.

## Acceptance Criteria

- [ ] Duplicate fileToArrayBuffer function in expense-detail-with-receipt.ts is removed
- [ ] Import statement for fileToArrayBuffer from shared utils is added
- [ ] Receipt upload functionality continues to work correctly
- [ ] No regression in file handling

## Implementation Plan

1. Check current state after task-025 changes\n2. Since binary-encoding.ts was removed, keep the inline function\n3. Mark task as no longer applicable

## Implementation Notes

Task no longer applicable after task-025 completion. The binary-encoding.ts file was removed, so the fileToArrayBuffer function in expense-detail-with-receipt.ts is now the only implementation and should remain.
