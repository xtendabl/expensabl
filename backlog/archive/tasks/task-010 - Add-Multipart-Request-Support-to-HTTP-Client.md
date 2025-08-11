---
id: task-010
title: Add Multipart Request Support to HTTP Client
status: To Do
assignee: []
created_date: '2025-08-05'
labels:
  - api
  - http-client
dependencies: []
---

## Description

Extend the HTTP client to handle multipart form data requests.

## Acceptance Criteria

- [ ] postMultipart method accepts FormData
- [ ] Browser sets Content-Type header with boundary
- [ ] Auth token included in request
- [ ] Proper error handling for failed uploads
