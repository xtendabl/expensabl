---
id: task-041
title: Simplify receipt service wrapper in service container
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-039
---

## Description

The service container creates an unnecessary wrapper around expense service receipt methods. This indirection can be simplified while maintaining test compatibility.

## Acceptance Criteria

- [ ] Receipt service wrapper is simplified to direct method references
- [ ] Test files continue to work with existing deps.receiptService interface
- [ ] No breaking changes to handler dependencies
- [ ] Receipt operations remain functional

## Implementation Plan

1. Find receipt service wrapper in service container\n2. Simplify to direct method references\n3. Verify handlers still work\n4. Run tests

## Implementation Notes

Simplified receipt service wrapper in service container to use direct method references with bind() instead of arrow functions. This reduces code complexity while maintaining the same interface for handlers and tests. All 637 tests passing.
