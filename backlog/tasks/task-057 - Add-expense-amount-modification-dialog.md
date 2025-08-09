---
id: task-057
title: Add expense amount modification dialog
status: Done
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-08'
labels:
  - enhanced-duplication
  - modal
  - duplication
dependencies:
  - task-054
---

## Description

Create a modal dialog that appears during expense duplication to allow users to modify the expense amount before creation. The dialog should pre-populate with the original amount and validate user input.

## Acceptance Criteria

- [x] Modal appears after clicking Duplicate Expense
- [x] Original expense amount is pre-populated
- [x] Currency is displayed and preserved
- [x] Input validation prevents invalid amounts
- [x] User can confirm or cancel modification
- [x] Modified amount is used in expense creation
- [x] Default to original amount if not modified

## Implementation Plan

1. Create AmountModificationModal class extending PromptModal
2. Add currency formatting and display
3. Implement amount validation logic
4. Pre-populate with original expense amount
5. Integrate with expense duplication flow
6. Handle confirm and cancel actions
7. Pass modified amount to expense creation
8. Add tests for the modal

## Implementation Notes

Implemented expense amount modification dialog that appears during template application:
- Created AmountModificationModal class extending PromptModal
- Added currency display and formatting support
- Implemented comprehensive input validation (numeric, positive, decimal places, max amount)
- Pre-populates with original expense amount
- Shows real-time comparison with original amount including percentage change
- Integrated with template application flow in sidepanel-ui
- Handles confirm and cancel actions appropriately
- Uses modified amount in expense creation
- Added comprehensive test coverage (17 passing tests)

Files created/modified:
- src/chrome/components/modals/amount-modification-modal.ts: Complete modal implementation
- src/chrome/components/modals/index.ts: Export amount modification modal
- src/chrome/sidepanel-ui.ts: Integrate modal in template application flow
- src/chrome/components/modals/__tests__/amount-modification-modal.test.ts: Unit tests
