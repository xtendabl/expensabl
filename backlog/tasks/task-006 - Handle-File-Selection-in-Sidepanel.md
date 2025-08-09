---
id: task-006
title: Handle File Selection in Sidepanel
status: Done
assignee: []
created_date: '2025-08-05'
updated_date: '2025-08-05'
labels:
  - ui
  - sidepanel
dependencies: []
---

## Description

Implement file processing and message sending from the sidepanel UI.

## Acceptance Criteria

- [ ] Convert selected files to ArrayBuffer
- [ ] Encode ArrayBuffer to base64
- [ ] Send properly formatted message to service worker
- [ ] Handle multiple file selection
- [ ] Show upload progress

## Implementation Plan

1. Process selected files in the file upload component\n2. Convert files to ArrayBuffer using FileReader API\n3. Encode ArrayBuffer to base64 for message passing\n4. Send attachment message to service worker\n5. Handle upload progress and feedback

## Implementation Notes

File selection handling is implemented in the ExpenseDetailWithReceipt component. The component processes selected files, converts them to ArrayBuffer, encodes to base64, and sends messages to the service worker. Multiple file selection is supported through the FileUpload component configuration. Upload progress and feedback are displayed through the component's UI states.
