---
id: task-085
title: Add message routing performance and latency logging
status: Done
assignee: []
created_date: '2025-08-12'
updated_date: '2025-08-12'
labels:
  - debug-logging
dependencies: []
---

## Description

Add detailed logging for the message passing system to track routing latency, handler execution timing, and cross-context communication delays between sidepanel and service worker.

## Acceptance Criteria

- [ ] Message routing logs include action type
- [ ] sender context
- [ ] and routing latency
- [ ] Handler execution timing is logged for each message handler
- [ ] Message queue depth and processing delays are tracked during high load
- [ ] Cross-context communication timing (sidepanel to service worker) is measured
- [ ] Message correlation IDs are used consistently across routing logs
- [ ] Failed message routing includes detailed error context and timing
- [ ] Service worker message handling race conditions are logged and tracked

## Implementation Notes

Added comprehensive message routing performance and latency logging to Router class. Tracks message queue depth, processing delays, handler execution timing, cross-context communication metrics, and routing statistics. Added sender analysis, payload structure analysis, and processing stats tracking. Includes detailed error context and timing for failed message routing.
