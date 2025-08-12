---
id: task-079
title: Add comprehensive raw HTTP request logging to ApiHttpClient
status: Done
assignee: []
created_date: '2025-08-12'
updated_date: '2025-08-12'
labels:
  - debug-logging
dependencies: []
---

## Description

Add detailed logging of raw HTTP requests including URL, method, headers, body content, and timing to enable debugging of API call differences and edge cases.

## Acceptance Criteria

- [ ] Raw request details are logged before each fetch() call with correlation ID
- [ ] Request headers are logged using sanitizeHeaders() method to redact sensitive data
- [ ] Request body is logged with appropriate handling for FormData vs JSON
- [ ] Request timing and timeout information is included
- [ ] Logs include full URL with query parameters for GET requests
- [ ] Log level is appropriate (debug for detailed request info)

## Implementation Notes

Added comprehensive raw HTTP request logging to ApiHttpClient. Logs include correlation ID, full URL, sanitized headers, detailed request body handling (JSON, FormData, File, binary), timeout info, and timing. Added logRequestBody() and logFormDataContents() methods with payload sanitization.
