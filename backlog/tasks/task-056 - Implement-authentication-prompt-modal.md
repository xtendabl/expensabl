---
id: task-056
title: Implement authentication prompt modal
status: Done
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-08'
labels:
  - enhanced-duplication
  - authentication
  - modal
dependencies:
  - task-054
  - task-055
---

## Description

Create a modal that appears when users are not authenticated to Navan. The modal should guide users to log in and provide options to retry authentication checking.

## Acceptance Criteria

- [x] Modal appears when authentication fails
- [x] Clear message explains authentication is required
- [x] Button to open Navan login page in new tab
- [x] Retry button to check authentication status
- [x] Modal closes automatically on successful authentication
- [x] Loading state while checking authentication
- [x] Error handling for repeated failures

## Implementation Plan

1. Create AuthenticationModal class extending Modal
2. Implement authentication check logic
3. Add button to open Navan in new tab
4. Add retry button with loading state
5. Implement auto-close on successful auth
6. Integrate with expense fetching flow
7. Add error handling for repeated failures
8. Test authentication flow

## Implementation Notes

Implemented authentication prompt modal that appears when users are not authenticated:
- Created AuthenticationModal class extending Modal base class
- Shows clear authentication instructions with visual icon
- Provides 'Open Navan' button to open login page in new tab
- Includes 'Check Authentication' button with retry logic
- Auto-checks authentication every 2 seconds in background
- Automatically closes on successful authentication
- Shows loading state while checking authentication
- Handles multiple retry attempts with error messages
- Integrated with expense fetching flow to show modal on auth failure
- Added comprehensive CSS styles with theme support

Files created/modified:
- src/chrome/components/modals/authentication-modal.ts: Complete modal implementation
- src/chrome/components/modals/index.ts: Export authentication modal
- src/chrome/sidepanel-ui.ts: Integrate modal in auth flow
- public/sidepanel.html: Added modal CSS styles
- src/chrome/components/modals/__tests__/authentication-modal.test.ts: Unit tests
