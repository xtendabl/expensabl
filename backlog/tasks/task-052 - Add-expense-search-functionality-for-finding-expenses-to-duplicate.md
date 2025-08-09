---
id: task-052
title: Add expense search functionality for finding expenses to duplicate
status: Done
assignee: []
created_date: '2025-08-07'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

Users need an easier way to find specific expenses when they want to duplicate them. The Navan API provides search endpoints that can filter expenses by merchant name and date range. This functionality should be accessible from the 'My Expenses' section and configurable to allow users to quickly locate the expense they want to duplicate.

## Acceptance Criteria

- [x] Users can search for expenses by merchant name from the My Expenses section
- [x] Users can filter expenses by date range
- [x] Search results update the expense list in real-time
- [x] Search functionality is configurable through settings
- [x] Search API calls use the existing authentication token
- [x] All existing expense functionality continues to work

## Implementation Plan

1. Analyze current expense listing implementation in sidepanel components
2. Add search UI components (merchant name input and date range picker) to My Expenses section
3. Implement search API methods in expense service using provided Navan endpoints
4. Add message handlers for search requests and responses
5. Integrate search with existing expense list rendering
6. Add configuration options to settings for search preferences
7. Test search functionality with various merchant names and date ranges
8. Ensure compatibility with existing expense operations (duplicate, view details)

## Implementation Notes

### Approach Taken
Implemented search functionality for expenses by integrating with the Navan API's existing search endpoints. The search feature allows users to filter expenses by merchant name and date range directly from the 'My Expenses' section.

### Features Implemented
1. **Search UI Components**: Added a search section with input fields for merchant name and date range filters in the sidepanel HTML
2. **Search API Integration**: Leveraged the existing Navan API endpoints:
   - /search/transactions?q={merchantName} for merchant name filtering
   - /search/transactions?authorizationInstant.from={date}&authorizationInstant.to={date} for date range filtering
3. **Message Handlers**: Extended the existing FETCH_EXPENSES handler to accept search parameters
4. **Settings Configuration**: Added a toggle in the Settings section to enable/disable the search feature
5. **User Experience**: Implemented real-time search with clear feedback, loading states, and toast notifications

### Technical Decisions and Trade-offs
- **Reuse Existing Infrastructure**: Instead of creating new endpoints, reused the existing expense fetching infrastructure with additional parameters
- **Client-side Configuration**: Used Chrome's local storage to persist search preference settings
- **Search Parameter Mapping**: Mapped UI search inputs to Navan API-specific parameters (q for merchant, authorizationInstant for dates)
- **Default Behavior**: Search is enabled by default but can be disabled through settings

### Modified Files
- public/sidepanel.html - Added search UI and settings section
- src/chrome/sidepanel-ui.ts - Added search handlers and settings management
- src/chrome/message-adapter.ts - Added searchExpenses action mapping
- src/features/expenses/types.ts - Extended ExpenseFilters interface with Navan API parameters
