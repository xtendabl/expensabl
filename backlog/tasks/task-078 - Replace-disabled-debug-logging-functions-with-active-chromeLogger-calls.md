---
id: task-078
title: Replace disabled debug logging functions with active chromeLogger calls
status: Done
assignee: []
created_date: '2025-08-12'
updated_date: '2025-08-12'
labels:
  - debug-logging
dependencies: []
---

## Description

The HTTP client and expense operations currently have disabled debug logging functions that prevent any visibility into API operations. Replace these with actual chromeLogger calls to enable debug logging in development builds.

## Acceptance Criteria

- [ ] All disabled logging functions in http-client.ts are replaced with chromeLogger calls
- [ ] All disabled logging functions in expense-operations.ts are replaced with chromeLogger calls
- [ ] Debug logs are visible in development builds when LOGGER_CONSOLE_ENABLED=true
- [ ] Existing log message formats and data structures are preserved

## Implementation Notes

Replaced all disabled debug logging functions in http-client.ts and expense-operations.ts with active chromeLogger calls. Fixed deprecated substr() usage and unused variable warnings. Debug logs are now enabled in development builds.
