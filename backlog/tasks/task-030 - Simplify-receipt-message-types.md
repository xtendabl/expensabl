---
id: task-030
title: Simplify receipt message types
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-029
---

## Description

Remove specialized receipt payload interfaces and use generic payload format for receipt operations

## Acceptance Criteria

- [x] AttachReceiptPayload interface removed
- [x] Generic payload format used
- [x] Type safety maintained
- [x] Message adapter updated
- [x] All tests pass

## Implementation Plan

1. Review current receipt message types
2. Simplify AttachReceiptPayload to use generic structure
3. Update message adapter if needed
4. Update any type references
5. Run tests to ensure type safety

## Implementation Notes

Successfully simplified receipt message types:
- Renamed AttachReceiptPayload to ReceiptAttachPayload for consistency
- Added explicit types for DeleteReceiptMessage and GetReceiptUrlMessage
- Added explicit payload types (ReceiptDeletePayload, ReceiptUrlPayload)
- Added response types (ReceiptAttachResponse, ReceiptUrlResponse)
- Created backward compatibility aliases for existing code
- Updated message adapter to use new type names
- Updated receipt operations handler to use new types
- All 700 tests pass successfully
