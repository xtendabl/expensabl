---
id: task-009
title: Implement Receipt Upload API Client
status: To Do
assignee: []
created_date: '2025-08-05'
labels:
  - api
  - expenses
dependencies: []
---

## Description

Create the API integration for uploading receipts to Navan.

## Acceptance Criteria

- [ ] Detect file type from MIME type or extension
- [ ] Ensure filename includes extension
- [ ] Create FormData with 'receipt' and 'type' fields
- [ ] Handle multipart/form-data requests
- [ ] Return receipt key and thumbnail info
