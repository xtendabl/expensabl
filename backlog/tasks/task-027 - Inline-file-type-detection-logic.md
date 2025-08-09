---
id: task-027
title: Inline file type detection logic
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-026
---

## Description

Remove the separate file-type-detector.ts utility and use simple inline file extension checks

## Acceptance Criteria

- [ ] file-type-detector.ts is deleted
- [ ] Simple regex pattern used for file validation
- [ ] Server handles final validation
- [ ] File type checking still works
- [ ] All tests pass

## Implementation Plan

1. Find all uses of file-type-detector.ts\n2. Replace with inline file extension checks\n3. Remove file-type-detector.ts and its tests\n4. Update all imports\n5. Run tests

## Implementation Notes

Removed file-type-detector.ts utility and its test file. Replaced with inline file type validation using simple arrays of supported types and extensions. File type detection logic simplified to use file extension or mime type suffix directly. All 637 tests passing.
