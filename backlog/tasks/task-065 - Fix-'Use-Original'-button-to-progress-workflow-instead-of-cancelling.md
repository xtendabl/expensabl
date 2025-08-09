---
id: task-065
title: Fix 'Use Original' button to progress workflow instead of cancelling
status: Done
assignee: []
created_date: '2025-08-09'
updated_date: '2025-08-09'
labels: []
dependencies: []
---

## Description

The 'Use Original' button in the amount modification modal should progress to the next step of the expense duplication workflow with the original amount, rather than closing the entire workflow. Currently, it incorrectly triggers the cancel callback which terminates the workflow entirely.

## Acceptance Criteria

- [ ] Clicking 'Use Original' button progresses to receipt upload step
- [ ] Original expense amount is preserved when 'Use Original' is clicked
- [ ] Workflow continues normally after using original amount
- [ ] Cancel button behavior remains unchanged for actual cancellation
- [ ] All existing tests continue to pass

## Implementation Notes

Fixed the 'Use Original' button in the amount modification modal to properly progress the workflow with the original amount instead of cancelling. The solution involved:

1. Modified AmountModificationModal to track whether 'Use Original' was clicked vs X button close
2. Updated modal to call onConfirm with original amount when 'Use Original' is clicked  
3. Added onClose support to PromptModal base class to distinguish X button closes
4. Updated workflow to handle both cases: 'Use Original' continues workflow, X button cancels
5. Updated tests to reflect new behavior - 'Use Original' always calls onConfirm with original amount
