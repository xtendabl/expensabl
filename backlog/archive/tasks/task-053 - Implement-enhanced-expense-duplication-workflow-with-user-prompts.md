---
id: task-053
title: Implement enhanced expense duplication workflow with user prompts
status: To Do
assignee: []
created_date: '2025-08-08'
updated_date: '2025-08-08'
labels: []
dependencies: []
---

## Description

Users need a streamlined expense duplication process that automatically loads expenses, prompts for amount modifications, handles receipt uploads, and allows choosing between submitting or saving as draft. This workflow should guide users through each step with clear prompts and handle authentication seamlessly.

## Acceptance Criteria

- [ ] Expenses automatically load when sidepanel opens
- [ ] Authentication prompt appears if user is not logged into Navan
- [ ] User can modify expense amount before duplication through a modal dialog
- [ ] Receipt upload prompt appears after expense creation
- [ ] User can choose between Submit and Save as Draft options
- [ ] All existing expense functionality remains intact
- [ ] Workflow can be cancelled at any step
- [ ] Loading states and error handling work correctly

## Implementation Plan

1. Create Modal System Infrastructure
   - Implement base modal component with consistent styling
   - Add modal manager for controlling modal flow
   - Create modal backdrop and escape/cancel handling

2. Implement Auto-fetch on Sidepanel Open
   - Modify sidepanel initialization to trigger automatic expense fetch
   - Add loading spinner that appears immediately
   - Check authentication status before fetching
   - Handle success and error states gracefully

3. Create Authentication Prompt Modal
   - Design modal with clear messaging about authentication requirement
   - Include 'Go to Navan' button that opens app.navan.com in new tab
   - Add 'Retry' button to check authentication again
   - Implement auto-detection of successful authentication

4. Enhance Duplicate Expense Flow
   - Intercept duplicate expense button click
   - Create amount modification modal with input field
   - Pre-populate with original expense amount and currency
   - Add validation for amount input
   - Store modified amount for expense creation

5. Implement Receipt Upload Prompt
   - Create receipt upload modal that appears after expense creation
   - Reuse ExpenseDetailWithReceipt component functionality
   - Support drag-and-drop and file selection
   - Add 'Upload Receipt' and 'Skip' buttons
   - Show upload progress and success feedback

6. Add Submit vs Draft Selection
   - Create final action modal with two prominent buttons
   - Modify expense service to support draft state creation
   - Implement submitExpense path for full submission
   - Implement saveAsDraft path that skips submission step
   - Show appropriate success message for each path

7. Update Message Handlers
   - Extend CREATE_EXPENSE handler to support isDraft flag
   - Modify expense creation flow to handle draft state
   - Ensure proper error handling for each step

8. Add Workflow State Management
   - Track current step in duplication workflow
   - Allow cancellation at any point
   - Clean up state on completion or cancellation
   - Preserve user inputs between steps

9. Testing and Error Handling
   - Test full workflow end-to-end
   - Add error recovery for network failures
   - Ensure modals close properly on success/cancel
   - Verify draft expenses are created correctly
