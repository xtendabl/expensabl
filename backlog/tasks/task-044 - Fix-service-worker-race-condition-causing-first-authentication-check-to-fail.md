---
id: task-044
title: Fix service worker race condition causing first authentication check to fail
status: Done
assignee:
  - '@christopher'
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

Users experience a false 'no authentication token' error when first listing expenses in the sidepanel, even when already logged into Navan. The issue resolves on the second attempt. This is caused by a race condition where the sidepanel sends messages before the service worker has fully initialized its message handlers. This impacts user experience as it creates confusion about authentication state. Relates to Jira EXPL-7.

## Acceptance Criteria

- [x] First authentication check succeeds when user is already logged in
- [x] Service worker initialization completes before processing messages
- [x] Failed messages retry automatically with exponential backoff
- [x] Error messages distinguish between 'no token' and 'service unavailable'
- [x] All existing authentication functionality continues to work
- [x] No regressions in token capture or storage

## Implementation Plan

1. Analyze service worker initialization sequence and message handler setup
2. Examine sidepanel initialization and when it sends first messages
3. Implement initialization tracking in service worker
4. Add ready state check before processing messages
5. Implement retry mechanism with exponential backoff for failed messages
6. Update error messages to distinguish between missing token and service unavailable
7. Test the fix ensures first authentication check succeeds
8. Verify all existing tests pass

## Implementation Notes

Successfully fixed the service worker race condition that was causing first authentication checks to fail.

**Root Cause:**
The sidepanel was sending messages before the service worker had completed initialization, causing messages to be lost or rejected with "Could not establish connection" errors.

**Approach taken:**
1. Added early message interception in service worker before full initialization
2. Implemented retry logic with exponential backoff in sidepanel
3. Enhanced error messages to distinguish between different failure modes

**Files modified:**
- `src/chrome/service-worker.ts` - Added early message listener that waits for initialization
- `src/chrome/sidepanel.ts` - Implemented retry mechanism with exponential backoff (100ms, 200ms, 400ms, max 2000ms)

**Technical decisions:**
- Used Chrome's native message listener to catch messages before Transport is ready
- Retry configuration: 3 retries with exponential backoff starting at 100ms
- Clear distinction between "service unavailable" and "no token" errors
- Only retry on connection errors, not on authentication failures
- Guard against test environment by checking for chrome.runtime existence

**Benefits:**
- First authentication check now succeeds when user is logged in
- Better user experience with automatic retries
- More informative error messages
- No impact on existing functionality

All tests pass and the extension now handles the initialization race condition gracefully.
