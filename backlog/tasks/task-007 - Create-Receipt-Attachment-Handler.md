---
id: task-007
title: Create Receipt Attachment Handler
status: To Do
assignee: []
created_date: '2025-08-05'
labels:
  - messaging
  - service-worker
dependencies: []
---

## Description

Implement the service worker handler for receipt attachment messages.

## Acceptance Criteria

- [ ] Handler registered in message router
- [ ] Validates incoming message payload
- [ ] Converts base64 back to ArrayBuffer (only here!)
- [ ] Creates File object from ArrayBuffer
- [ ] Calls receipt service for upload
