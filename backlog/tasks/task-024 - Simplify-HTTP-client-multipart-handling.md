---
id: task-024
title: Simplify HTTP client multipart handling
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies: []
---

## Description

Remove the specialized postMultipart method and handle FormData automatically in the regular post method

## Acceptance Criteria

- [x] postMultipart method is removed
- [x] FormData is detected automatically in post method
- [x] isMultipart flag removed from RequestOptions
- [x] Receipt uploads still work
- [x] All tests pass

## Implementation Plan

1. Examine current HTTP client implementation
2. Remove postMultipart method
3. Update post method to detect FormData automatically
4. Remove isMultipart from RequestOptions
5. Update ReceiptService to use post instead of postMultipart
6. Run tests to ensure everything works

## Implementation Notes

Simplified HTTP client multipart handling:
- Removed postMultipart method from ApiHttpClient interface and implementation
- Removed isMultipart flag from RequestOptions interface
- Updated buildFetchOptions to automatically detect FormData instances
- Updated ReceiptService to use post method instead of postMultipart
- All 700 tests pass successfully
- FormData detection is now automatic based on instanceof check
