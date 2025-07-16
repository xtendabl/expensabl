# Template Data Model Documentation

## Overview
The template data model provides a structured way to store and manage recurring expense templates in the Expensabl Chrome extension. This allows users to save frequently used expense patterns (like monthly phone bills) and reuse them for quick expense creation.

## Storage Architecture

### Storage Key
All templates are stored under the key `expenseTemplates` in `chrome.storage.local`.

### Storage Structure
```javascript
{
  "expenseTemplates": {
    "template-1648123456789-abc123def": {
      id: "template-1648123456789-abc123def",
      name: "Monthly Phone Bill",
      description: "Recurring monthly phone expense",
      frequency: "monthly",
      createdAt: "2025-07-16T10:30:00.000Z",
      updatedAt: "2025-07-16T10:30:00.000Z",
      version: 1,
      expenseData: { ... }
    }
  }
}
```

## Template Schema

### Core Template Fields
- **id**: Unique identifier (format: `template-{timestamp}-{random}`)
- **name**: User-friendly name (max 50 characters, must be unique)
- **description**: Optional description (max 200 characters)
- **frequency**: Recurrence pattern (`monthly`, `weekly`, `quarterly`, `yearly`, `custom`)
- **createdAt**: ISO 8601 timestamp of creation
- **updatedAt**: ISO 8601 timestamp of last modification
- **version**: Schema version number for migration support

### Expense Data Structure
Based on the manual expense API payload from `manual_post.js`:

```javascript
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
  merchantCurrency: string,   // Required: ISO currency code (e.g., "USD")
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
```

## Validation Rules

### Required Fields
- `name`
- `expenseData.merchant.name`
- `expenseData.merchantAmount`
- `expenseData.merchantCurrency`
- `expenseData.policy`

### Field Constraints
- **name**: Max 50 characters, must be unique across all templates
- **description**: Max 200 characters
- **frequency**: Must be one of: `monthly`, `weekly`, `quarterly`, `yearly`, `custom`
- **merchantAmount**: Must be a positive number
- **merchantCurrency**: Must be valid ISO 4217 currency code
- **Template size**: Max 8KB per template

### Business Rules
- Template names must be unique per user
- Templates cannot exceed storage quota limits
- Expense data must be compatible with Navan API requirements

## Storage Limits and Quota Management

### Chrome Extension Storage Limits
- **Total storage quota**: 5MB for entire extension
- **Per-template limit**: 8KB maximum
- **Estimated capacity**: ~640 templates at maximum size

### Storage Usage Monitoring
The `TemplateManager.getStorageUsage()` function provides:
- Current template count
- Total storage size used
- Average template size
- Percentage of quota used

## Schema Versioning

### Version Management
- Current schema version: 1
- Version field included in each template for migration support
- Future schema changes will increment version number

### Migration Strategy
- When schema changes occur, migration functions will update existing templates
- Old versions will be supported during transition period
- Users will be notified of significant schema changes

## API Integration

### Template to Expense Conversion
Templates are converted to expense payloads using `TemplateManager.templateToExpensePayload()`:

```javascript
const expensePayload = TemplateManager.templateToExpensePayload(template, {
  date: new Date().toISOString(),
  merchantAmount: 50.00,
  description: "Updated description"
});
```

### Supported Overrides
- **date**: Override expense date (defaults to current date)
- **merchantAmount**: Override amount (defaults to template amount)
- **description**: Override expense description

## Error Handling

### Validation Errors
- Missing required fields
- Invalid field values
- Template size exceeded
- Name uniqueness violations

### Storage Errors
- Quota exceeded
- Storage permission denied
- Corruption detection
- Network connectivity issues

## Security Considerations

### Data Sanitization
- All user input is sanitized before storage
- Dynamic/sensitive fields are excluded from templates
- No authentication tokens stored in templates

### Privacy
- Templates stored locally in user's browser
- No template data transmitted to external servers
- User controls template creation and deletion

## Performance Optimization

### Storage Access Patterns
- Templates loaded on demand
- Bulk operations for multiple templates
- Caching for frequently accessed templates

### Memory Management
- Templates garbage collected after use
- Storage cleanup for deleted templates
- Periodic storage optimization

## Usage Examples

### Creating a Template
```javascript
const templateData = TemplateManager.createTemplate(
  "Monthly Phone Bill",
  "AT&T phone service",
  "monthly",
  expenseDataFromAPI
);
```

### Validating a Template
```javascript
const validation = TemplateManager.validateTemplate(template);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}
```

### Converting to Expense
```javascript
const expensePayload = TemplateManager.templateToExpensePayload(template, {
  date: "2025-07-16T00:00:00.000Z"
});
```