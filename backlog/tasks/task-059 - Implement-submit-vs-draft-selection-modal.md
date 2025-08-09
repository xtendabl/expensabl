---
id: task-059
title: Implement submit vs draft selection modal
status: Done
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-09'
labels:
  - enhanced-duplication
  - modal
  - draft
dependencies:
  - task-054
  - task-060
---

## Description

Create a final modal in the expense duplication flow that allows users to choose between submitting the expense immediately or saving it as a draft for later submission.

## Acceptance Criteria

- [x] Modal appears as final step in duplication flow
- [x] Submit button creates and submits expense
- [x] Save as Draft button creates expense in draft state
- [x] Both options show appropriate success messages
- [x] Modal clearly explains the difference between options
- [x] Proper navigation after each choice
- [x] Error handling for both paths

## Implementation Plan

1. Create SubmitDraftModal class extending Modal
2. Design clear UI with Submit and Save as Draft options
3. Add explanatory text for each option
4. Integrate with expense creation flow
5. Handle both submission paths (draft vs immediate)
6. Show appropriate success messages
7. Add error handling for both paths
8. Create tests for the modal

## Implementation Notes

Successfully implemented the submit vs draft selection modal that appears as the final step in the expense duplication flow. The implementation includes:

### Features Implemented
- Created `SubmitDraftModal` class extending the base `Modal` class
- Designed a clear, user-friendly UI with two distinct option cards:
  - "Submit for Approval" - immediately submits the expense
  - "Save as Draft" - saves expense in draft state for later submission
- Added comprehensive explanatory text and benefits for each option
- Integrated with expense duplication flow in `handleDuplicateExpense` method
- Implemented both submission paths using existing expense creation APIs
- Added appropriate success toast messages for each path
- Included error handling with button re-enabling on failures
- Created comprehensive test suite with 23 tests covering all functionality

### Technical Decisions
- Used option cards with click handlers for better UX instead of just buttons
- Disabled backdrop click to prevent accidental closure during important decision
- Maintained ESC key closure for accessibility
- Used async/await pattern for API calls with proper error propagation
- Added visual feedback during processing (button text changes, disabled state)
- Integrated with existing toast notification system for success/error messages

### Modified Files
- `src/chrome/components/modals/submit-draft-modal.ts` - Created modal implementation
- `src/chrome/sidepanel-ui.ts` - Integrated modal into duplication workflow
- `src/chrome/components/modals/__tests__/submit-draft-modal.test.ts` - Added comprehensive tests

The modal successfully guides users through the final decision of whether to submit their duplicated expense immediately or save it as a draft for later review and submission.

Successfully implemented the submit vs draft selection modal as the final step in expense duplication flow. Created SubmitDraftModal class with clear UI showing two options, integrated with expense creation API supporting both immediate submission and draft saving, added comprehensive tests, and proper error handling.
