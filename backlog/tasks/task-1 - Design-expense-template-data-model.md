---
id: task-1
title: Design expense template data model
status: Done
assignee: []
created_date: '2025-07-16'
updated_date: '2025-07-16'
labels: []
dependencies: []
---

## Description

Define the data structure and storage schema for expense templates that allows users to save recurring expenses as reusable templates

## Acceptance Criteria

- [x] Template schema defined with all required fields from manual expense payload structure
- [x] Template metadata includes: unique ID, name, description, frequency, createdAt, updatedAt timestamps
- [x] Template data structure preserves all manual expense fields: date, merchant, merchantAmount, merchantCurrency, policy, details, reportingData
- [x] Storage schema designed for chrome.storage.local with key structure and size considerations
- [x] Template validation rules specified for required fields, data types, and business logic
- [x] Schema versioning strategy defined for future template structure changes
- [x] Storage quota management approach documented for template size limits


## Implementation Plan

1. Analyze existing storage patterns in codebase\n2. Design template data model based on manual expense payload\n3. Define storage schema for chrome.storage.local\n4. Implement template validation logic\n5. Add schema versioning support\n6. Document storage quota management approach\n7. Create template utility functions

## Implementation Notes

Implemented complete template data model with comprehensive schema, validation, and storage management. Created template-manager.js with full TemplateManager class including validation, storage utilities, and API conversion functions. Added detailed documentation in backlog/docs/template-data-model.md covering all aspects of the template system. All acceptance criteria completed successfully.
## Technical Specifications

### Template Schema Structure
Based on manual expense payload from `manual_post.js`:
```javascript
{
  id: string,                    // UUID for template identification
  name: string,                  // User-friendly template name (max 50 chars)
  description: string,           // Template description (max 200 chars)
  frequency: string,             // "monthly", "weekly", "quarterly", "yearly"
  createdAt: string,            // ISO 8601 timestamp
  updatedAt: string,            // ISO 8601 timestamp
  version: number,              // Schema version for migration support
  expenseData: {
    merchant: {
      name: string,             // Required: merchant name
      logo: string,             // Optional: merchant logo URL
      category: string,         // Required: expense category
      online: boolean,          // Default: false
      perDiem: boolean,         // Default: false
      timeZone: string,         // Default: "Z"
      formattedAddress: string, // Optional: merchant address
      categoryGroup: string,    // Required: category group
      description: string       // Optional: merchant description
    },
    merchantAmount: number,     // Required: positive number
    merchantCurrency: string,   // Required: ISO currency code
    policy: string,            // Required: expense policy
    details: {
      participants: array,      // Current user participant data
      description: string,      // Optional: expense description
      customFieldValues: array, // Optional: custom field data
      taxDetails: object,       // Tax information structure
      personal: boolean,        // Default: false
      personalMerchantAmount: number // Optional: personal portion
    },
    reportingData: {
      department: string,       // Optional: department code
      billTo: string,          // Optional: billing information
      subsidiary: string,      // Optional: subsidiary code
      region: string           // Optional: region code
    }
  }
}
```

### Storage Requirements
- Use chrome.storage.local with key: `expenseTemplates`
- Implement template size validation (max 8KB per template)
- Consider storage quota limits (5MB total for extension)
- Support for template export/import for backup

### Validation Rules
- Template name must be unique per user
- Required fields: name, merchant.name, merchantAmount, merchantCurrency, policy
- merchantAmount must be positive number
- merchantCurrency must be valid ISO 4217 code
- frequency must be one of predefined values
- Template size must not exceed storage limits
