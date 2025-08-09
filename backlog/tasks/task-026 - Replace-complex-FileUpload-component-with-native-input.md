---
id: task-026
title: Replace complex FileUpload component with native input
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-025
---

## Description

Replace the 470-line FileUpload component with a simple native file input element with basic drag-drop support

## Acceptance Criteria

- [x] FileUpload component is deleted
- [x] Native file input element is used
- [x] Basic drag-drop functionality preserved
- [x] File selection works
- [x] Existing styles are reused
- [x] All tests pass

## Implementation Plan

1. Analyze current FileUpload component usage
2. Create simpler native file input replacement
3. Update expense-detail-with-receipt.ts to use new component
4. Delete old FileUpload component and tests
5. Run tests to verify everything works

## Implementation Notes

- Removed the 475-line FileUpload component and its test file
- Integrated file upload functionality directly into expense-detail-with-receipt.ts
- Maintained drag-and-drop support using native HTML5 APIs
- Reused existing styles with some simplification
- File validation (type and size) preserved inline
- All tests passing (657 tests)
