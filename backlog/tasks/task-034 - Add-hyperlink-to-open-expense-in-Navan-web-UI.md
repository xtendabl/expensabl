---
id: task-034
title: Add hyperlink to open expense in Navan web UI
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

Users need a quick way to navigate from the Expense Detail view in the Chrome extension to the full expense view in the Navan web application. This will enable users to access all native Navan features and perform actions that may not be available in the extension.

## Acceptance Criteria

- [x] Hyperlink is displayed prominently in the Expense Detail view
- [x] Clicking the link opens the expense in a new tab on app.navan.com
- [x] Link uses the correct expense ID to construct the Navan URL
- [x] Link is visually distinguishable as an external link
- [x] Link works for all expense statuses and types
- [x] Link has appropriate tooltip text explaining its purpose

## Implementation Plan

1. Find where expense detail is rendered\n2. Add hyperlink to open in Navan\n3. Use correct URL format for Navan expenses\n4. Add appropriate styling and icon\n5. Test the link works

## Implementation Notes

Added a hyperlink to the expense detail view header that opens the expense in the Navan web application. The implementation includes:

- **Approach taken**: Integrated the link directly into the detail header section of sidepanel-ui.ts
- **Features implemented**: 
  - Hyperlink with URL format `https://app.navan.com/app/liquid/user/transactions/details-new/${expenseId}`
  - External link SVG icon to indicate navigation to web app
  - Styled button-like appearance with hover effects for better UX
- **Technical decisions**:
  - Used inline SVG for the external link icon to avoid additional asset dependencies
  - Positioned link in the header alongside the settings button for prominence
  - Applied `target="_blank"` and `rel="noopener noreferrer"` for security
- **Modified files**:
  - src/chrome/sidepanel-ui.ts (added link HTML and CSS styling)
