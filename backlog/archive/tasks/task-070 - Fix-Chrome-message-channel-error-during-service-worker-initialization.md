---
id: task-070
title: Fix Chrome message channel error during service worker initialization
status: To Do
assignee: []
created_date: '2025-08-09'
labels: []
dependencies: []
---

## Description

The Chrome extension is experiencing a critical error where messages sent from the sidepanel to the service worker during initialization fail with 'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received'. This happens because the early message handler in service-worker.ts returns true but never calls sendResponse(), causing the message channel to close without sending a response. This prevents proper communication between the sidepanel and background service worker during startup.

## Acceptance Criteria

- [ ] No 'message channel closed' errors in console during extension startup
- [ ] Messages sent during service worker initialization are properly handled
- [ ] All sidepanel-to-background communications work reliably
- [ ] Service worker initialization completes without errors
- [ ] Search and fetch operations work immediately after sidepanel opens
- [ ] No duplicate message listeners causing conflicts
