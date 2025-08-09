---
id: task-060
title: Add draft state support to expense service
status: Done
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-08'
labels:
  - enhanced-duplication
  - draft
  - api
dependencies: []
---

## Description

Modify the expense creation service and message handlers to support creating expenses in draft state. This requires changes to the API calls to skip the submission step when creating drafts.

## Acceptance Criteria

- [x] ExpenseService supports isDraft parameter
- [x] CREATE_EXPENSE handler accepts isDraft flag
- [x] Draft expenses skip the submission API call
- [x] Draft state is properly reflected in UI
- [x] Existing full submission flow remains unchanged
- [x] Error handling for draft creation
- [x] Draft expenses can be submitted later

## Implementation Plan

1. Review current expense creation flow and API calls
2. Add isDraft parameter to ExpenseCreatePayload type
3. Update CREATE_EXPENSE handler to accept isDraft flag
4. Modify expense operations service to handle draft state
5. Update API calls to skip submission when isDraft is true
6. Add draft state indicator to expense response types
7. Update UI components to show draft status
8. Add tests for draft creation flow

## Implementation Notes

Implemented draft state support for expense creation:\n- Added isDraft parameter to ExpenseCreatePayload type\n- Modified ExpenseService.createExpense to skip submission step when isDraft is true\n- Added submitDraftExpense method to ExpenseService for submitting drafts later\n- Created SUBMIT_DRAFT_EXPENSE message action and handler\n- Added submitDraftExpense method to ExpenseManager base class\n- Registered new handler in the message router\n- Updated UI to use correct message actions (createExpense instead of submitExpense)\n- Added comprehensive tests for draft workflow (7 passing tests)\n\nFiles created/modified:\n- src/features/expenses/types.ts: Added isDraft to ExpenseCreatePayload\n- src/features/expenses/services/expense-operations.ts: Modified createExpense, added submitDraftExpense\n- src/features/messaging/types.ts: Added SUBMIT_DRAFT_EXPENSE action\n- src/features/messaging/handlers/expense/submit-draft-expense.handler.ts: New handler\n- src/features/expenses/manager.ts: Added submitDraftExpense method\n- src/features/messaging/handlers/typed-registry.ts: Registered new handler\n- src/chrome/sidepanel-ui.ts: Fixed message action names\n- src/features/expenses/services/__tests__/expense-operations-draft.test.ts: New test file
