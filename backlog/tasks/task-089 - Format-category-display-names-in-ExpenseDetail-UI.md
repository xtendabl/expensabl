---
id: task-089
title: Format category display names in ExpenseDetail UI
status: To Do
assignee: []
created_date: '2025-08-12'
labels: []
dependencies: []
---

## Description

The ExpenseDetail section currently displays raw category values from the backend (e.g., 'miscellaneous_food_stores', 'computer_software_stores'). These should be transformed into user-friendly display values (e.g., 'Miscellaneous Food Stores', 'Computer Software Stores') while preserving the original backend values for API operations.

## Acceptance Criteria

- [ ] Category values are transformed from snake_case to Title Case format
- [ ] Original backend values remain unchanged for API communication
- [ ] All existing category values display correctly with proper formatting
- [ ] ExpenseDetail UI shows formatted category names instead of raw values
- [ ] Existing functionality for category selection and filtering remains intact
