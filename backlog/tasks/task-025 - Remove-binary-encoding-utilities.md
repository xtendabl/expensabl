---
id: task-025
title: Remove binary encoding utilities
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-023
---

## Description

Delete the binary-encoding.ts utility file and use native browser APIs directly where needed

## Acceptance Criteria

- [x] binary-encoding.ts file is deleted
- [x] Native FileReader API used where needed
- [x] No ArrayBuffer to base64 conversions
- [x] File uploads work correctly
- [x] All tests pass

## Implementation Plan

1. Find all imports of binary-encoding.ts
2. Replace usage with native FileReader API
3. Delete binary-encoding.ts file
4. Update any tests that use binary encoding
5. Run tests to ensure everything works

## Implementation Notes

- Removed binary-encoding.ts utility file and its test file
- Replaced validateFileSize function in FileUpload component with inline validation
- Added arrayBufferToBase64 method directly in expense-detail-with-receipt.ts component
- Added base64ToArrayBuffer method directly in receipt-operations.handler.ts
- Removed export from shared/utils/index.ts
- All tests passing (678 tests)
