---
id: task-038
title: Simplify HTTP client error response logging
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

The HTTP client has verbose HTML parsing logic for error responses that attempts to extract titles from HTML pages. This over-engineered error handling can be simplified to basic error logging.

## Acceptance Criteria

- [ ] HTML parsing logic for error responses is removed
- [ ] Basic error logging for non-JSON responses is retained
- [ ] Error context (status code and type) is still logged
- [ ] API error handling continues to work correctly

## Implementation Plan

1. Find HTML parsing logic in HTTP client\n2. Replace with simple error logging\n3. Keep essential error information\n4. Run tests to verify

## Implementation Notes

Removed HTML parsing logic from HTTP client error handling. Simplified to log only essential error context (status, statusText, contentType) without attempting to parse HTML responses or extract titles. Removed rawResponse logging to avoid potential security issues. All 637 tests passing.
