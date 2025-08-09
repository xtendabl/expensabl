---
id: task-028
title: Merge receipt service into expense service
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels:
  - receipt-simplification
  - cleanup
dependencies:
  - task-023
  - task-024
---

## Description

Eliminate the separate ReceiptService class and add receipt methods directly to the existing ExpenseService

## Acceptance Criteria

- [x] ReceiptService class is deleted
- [x] Receipt methods added to ExpenseService
- [x] All receipt operations work
- [x] Service dependencies updated
- [x] All tests pass

## Implementation Plan

1. Copy receipt methods from ReceiptService to ExpenseService
2. Update ExpenseService to include receipt operations
3. Update ExtendedExpenseManager to use ExpenseService for receipts
4. Update service container and dependencies
5. Delete ReceiptService file
6. Run tests to ensure everything works

## Implementation Notes

Successfully merged receipt service into expense service:
- Added receipt methods (uploadReceipt, getReceiptUrl, deleteReceipt) to ExpenseService
- Added ReceiptUploadResult interface to expense-operations.ts
- Updated ExtendedExpenseManager to use ExpenseService for receipt operations
- Removed ReceiptService import from manager-with-auth.ts
- Updated ServiceContainer to provide a receiptService getter that delegates to expenseManager
- Updated HandlerDependencies interface to use a receipt service interface
- Deleted the ReceiptService file
- Changed expenseService from private to protected in ExpenseManager base class
- All 700 tests pass successfully
