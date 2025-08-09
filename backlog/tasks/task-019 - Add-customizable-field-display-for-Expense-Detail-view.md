---
id: task-019
title: Add customizable field display for Expense Detail view
status: Done
assignee: []
created_date: '2025-08-06'
updated_date: '2025-08-07'
labels: []
dependencies: []
---

## Description

Users need the ability to personalize which expense fields are displayed when viewing an expense detail. Currently, the expense detail view shows a fixed set of fields. Different users may have different priorities for which information they want to see at a glance. This feature will allow users to select up to 8 fields from all available expense data fields to customize their expense detail view according to their workflow needs.

## Acceptance Criteria

- [x] Users can access a settings panel to select which fields to display
- [x] Users can select up to 8 fields from all available expense data fields
- [x] Selected field preferences are persisted in Chrome storage
- [x] Expense detail view displays only the user-selected fields
- [x] Default field selection is provided for first-time users
- [x] Field selection UI shows field names in a user-friendly format
- [x] Users can reorder selected fields to control display order
- [x] Changes to field selection are immediately reflected in the expense detail view

## Implementation Plan

1. Create a field configuration service to manage available fields and user preferences
2. Build a settings UI component with field selection and drag-and-drop reordering
3. Implement storage layer using Chrome storage API
4. Integrate the field configuration into the expense detail view
5. Add a settings button to access the field customization modal
6. Test persistence and display of customized fields

## Implementation Notes

- Created `FieldConfigurationService` class that manages field configuration, storage, and formatting
- Implemented a comprehensive list of 20 available expense fields with custom formatters
- Built `FieldSettings` component with dual-column UI for selecting and reordering fields
- Added drag-and-drop functionality for reordering selected fields
- Integrated field configuration into expense detail view with dynamic field rendering
- Added settings button (⚙️) in expense detail header to open customization modal
- Implemented modal UI for field settings with save/cancel functionality
- Persisted user preferences in Chrome local storage
- Default configuration includes 8 common fields: merchant, amount, date, category, status, policy, created date, and description
- Field values are dynamically extracted using path notation (e.g., 'merchant.name', 'expenseProperties.dateSubmitted')
- Special formatting for status (colored badge) and amount (highlighted) fields
- Changes are immediately reflected after saving settings

### Files Created/Modified:
- Created: `src/features/expenses/services/field-configuration-service.ts`
- Created: `src/chrome/components/field-settings.ts`
- Modified: `src/chrome/sidepanel-ui.ts`
