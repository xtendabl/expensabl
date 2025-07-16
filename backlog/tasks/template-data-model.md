# Template Data Model

## Description
Design and implement the data structure for expense templates that allows users to save recurring expenses (like monthly bills) as reusable templates.

## Status
To Do

## Priority
High

## Acceptance Criteria
- [ ] Define template schema based on manual expense payload structure
- [ ] Create template metadata fields (name, description, frequency, creation date)
- [ ] Implement template storage functions using `chrome.storage.local`
- [ ] Add template validation logic to ensure required fields are present
- [ ] Support template versioning for future compatibility

## Technical Requirements

### Template Schema
Based on the manual expense payload structure from `manual_post.js`, templates should include:

```javascript
{
  id: string,                    // Unique template identifier
  name: string,                  // User-friendly template name
  description: string,           // Template description
  frequency: string,             // "monthly", "weekly", "quarterly", etc.
  createdAt: string,            // ISO date string
  updatedAt: string,            // ISO date string
  expenseData: {
    merchant: {
      name: string,
      logo: string,
      category: string,
      online: boolean,
      perDiem: boolean,
      timeZone: string,
      formattedAddress: string,
      categoryGroup: string,
      description: string
    },
    merchantAmount: number,
    merchantCurrency: string,
    policy: string,
    details: {
      participants: array,
      description: string,
      customFieldValues: array,
      taxDetails: object,
      personal: boolean,
      personalMerchantAmount: number
    },
    reportingData: {
      department: string,
      billTo: string,
      subsidiary: string,
      region: string
    }
  }
}
```

### Storage Functions
- `saveTemplate(templateData)` - Save new template to storage
- `getTemplate(templateId)` - Retrieve specific template by ID
- `getAllTemplates()` - Get all saved templates
- `updateTemplate(templateId, templateData)` - Update existing template
- `deleteTemplate(templateId)` - Remove template from storage

### Validation Rules
- Template name must be unique
- Required fields: name, merchant.name, merchantAmount, merchantCurrency
- merchantAmount must be positive number
- Validate against current API requirements

## Implementation Notes
- Use `chrome.storage.local` for persistence
- Store templates under key `expenseTemplates`
- Implement error handling for storage operations
- Consider storage quota limits for large numbers of templates

## Files to Modify
- Create new file: `template-manager.js`
- Update: `content.js` (add template-related message handlers)
- Update: `manifest.json` (ensure storage permissions)

## Dependencies
- Existing `chrome.storage.local` pattern
- Manual expense API payload structure
- Current authentication system