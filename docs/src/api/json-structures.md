# JSON Data Structures Reference

This document provides a comprehensive reference for all JSON data structures used in the Expensabl Chrome extension, with examples of actual objects and their relationships.

## Table of Contents

1. [Expense Data Structures](#expense-data-structures)
2. [Template Data Structures](#template-data-structures)
3. [Authentication Structures](#authentication-structures)
4. [Message Types](#message-types)
5. [Storage Structures](#storage-structures)
6. [Error Structures](#error-structures)

## Expense Data Structures

### ExpenseCreatePayload - Request to Create New Expense

```json
{
  "merchant": "Office Depot",
  "amount": 45.99,
  "currency": "USD",
  "date": "2025-08-01",
  "policy": "OFFICE_SUPPLIES",
  "description": "Printer paper and pens for Q3",
  "project": "Marketing-2025",
  "customFields": {
    "costCenter": "MKT-100",
    "clientCode": "INTERNAL"
  }
}
```

### Expense - Full Expense Object

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "dateCreated": "2025-08-01T14:30:00.000Z",
  "dateModified": "2025-08-01T14:45:00.000Z",
  "dateSubmitted": null,
  "dateApproved": null,
  "status": "DRAFT",
  "source": "MANUAL",
  "user": {
    "uuid": "user-123",
    "email": "user@company.com",
    "givenName": "John",
    "familyName": "Doe",
    "fullName": "John Doe"
  },
  "merchant": {
    "uuid": "merchant-456",
    "name": "Office Depot",
    "category": "office_supplies_and_stationery",
    "categoryGroup": "OFFICE_SUPPLIES",
    "logo": "https://example.com/logos/office-depot.png"
  },
  "amount": 45.99,
  "currency": "USD",
  "accountAmount": 45.99,
  "accountCurrency": "USD",
  "merchantAmount": 45.99,
  "merchantCurrency": "USD",
  "date": "2025-08-01",
  "instant": "2025-08-01T14:30:00.000Z",
  "policy": "OFFICE_SUPPLIES",
  "policyName": "Office Supplies",
  "details": {
    "description": "Printer paper and pens for Q3",
    "project": "Marketing-2025",
    "participants": ["user-123"],
    "customFieldValues": [
      {
        "fieldId": "field-1",
        "fieldName": "Cost Center",
        "value": "MKT-100"
      }
    ],
    "glCode": {
      "uuid": "gl-789",
      "number": "6100",
      "name": "Office Supplies"
    }
  },
  "receiptRequired": false,
  "receiptKey": null,
  "flagged": false,
  "flag": {
    "status": null,
    "reasons": {},
    "reasonList": []
  },
  "reimbursementMethod": "PAYROLL",
  "reportingData": {
    "department": "Marketing",
    "billTo": "Corporate",
    "region": "North America"
  }
}
```

### ExpenseListResponse - Paginated Expense List

```json
{
  "expenses": [
    {
      "uuid": "expense-1",
      "merchant": "Starbucks",
      "amount": 12.50,
      "date": "2025-08-01",
      "status": "APPROVED"
    },
    {
      "uuid": "expense-2", 
      "merchant": "Uber",
      "amount": 28.75,
      "date": "2025-07-31",
      "status": "PENDING"
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

### SearchTransaction - Search Result Item

```json
{
  "uuid": "txn-123",
  "type": "expense",
  "merchantName": "Amazon",
  "amount": 89.99,
  "currency": "USD",
  "date": "2025-08-01",
  "status": "DRAFT",
  "policyName": "Technology",
  "description": "USB-C adapters",
  "highlightedFields": {
    "merchantName": "<em>Amazon</em> Web Services"
  }
}
```

## Template Data Structures

### ExpenseTemplate - Complete Template Object

```json
{
  "id": "template-123",
  "name": "Monthly Phone Bill",
  "description": "Verizon monthly service charge",
  "createdAt": "2025-07-01T10:00:00.000Z",
  "lastModified": "2025-08-01T14:30:00.000Z",
  "metadata": {
    "usageCount": 7,
    "lastUsed": "2025-08-01T09:00:00.000Z",
    "isFavorite": true,
    "tags": ["recurring", "utilities"],
    "version": 1
  },
  "expenseData": {
    "merchant": "Verizon",
    "amount": 85.00,
    "currency": "USD",
    "policy": "PHONE",
    "description": "Phone service - {month} {year}",
    "project": "Operations",
    "categoryGroup": "PHONE"
  },
  "scheduling": {
    "enabled": true,
    "frequency": "monthly",
    "interval": 1,
    "dayOfMonth": 15,
    "startTime": "09:00",
    "timezone": "America/New_York",
    "nextExecution": "2025-09-15T13:00:00.000Z",
    "endDate": null
  },
  "executionHistory": [
    {
      "id": "exec-456",
      "executedAt": "2025-08-15T13:00:05.000Z",
      "success": true,
      "expenseId": "expense-789",
      "error": null,
      "duration": 1250
    }
  ]
}
```

### CreateTemplateRequest

```json
{
  "name": "Client Lunch Template",
  "description": "Standard client lunch expense",
  "expenseData": {
    "merchant": "Restaurant (Variable)",
    "amount": 75.00,
    "currency": "USD",
    "policy": "MEALS_CLIENT",
    "description": "Client lunch - {client_name}"
  },
  "isFavorite": false
}
```

### TemplateExecution - Execution History Entry

```json
{
  "id": "exec-123",
  "templateId": "template-456",
  "executedAt": "2025-08-01T12:00:00.000Z",
  "success": true,
  "expenseId": "expense-789",
  "expenseData": {
    "merchant": "Verizon",
    "amount": 85.00,
    "description": "Phone service - August 2025"
  },
  "error": null,
  "duration": 1523,
  "retryCount": 0
}
```

## Authentication Structures

### TokenData - Stored Authentication Token

```json
{
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1753396268728,
  "refreshToken": "refresh_token_value",
  "tokenType": "Bearer",
  "scope": "expenses:read expenses:write",
  "metadata": {
    "userId": "user-123",
    "companyId": "company-456",
    "capturedAt": "2025-08-01T10:00:00.000Z",
    "source": "login",
    "lastValidated": "2025-08-01T14:00:00.000Z"
  }
}
```

## Message Types

### BackgroundMessage Examples

**Token Captured Message**
```json
{
  "action": "TOKEN_CAPTURED",
  "data": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "source": "fetch",
    "timestamp": 1753309868728
  }
}
```

**Create Expense Message**
```json
{
  "action": "CREATE_EXPENSE",
  "data": {
    "merchant": "Uber",
    "amount": 28.50,
    "currency": "USD",
    "date": "2025-08-01",
    "policy": "TRANSPORTATION"
  }
}
```

**Execute Template Message**
```json
{
  "action": "EXECUTE_TEMPLATE",
  "data": {
    "templateId": "template-123",
    "variables": {
      "month": "August",
      "year": "2025"
    }
  }
}
```

### MessageResponse

```json
{
  "success": true,
  "data": {
    "expenseId": "expense-123",
    "status": "CREATED"
  },
  "error": null,
  "timestamp": 1753309868728
}
```

## Storage Structures

### Storage Keys and Data Types

| Key | Type | Example Data |
|-----|------|--------------|
| `auth_token` | TokenData | See TokenData structure above |
| `templates` | Map<string, ExpenseTemplate> | Template objects indexed by ID |
| `recent_expenses` | Expense[] | Array of recent expense objects |
| `user_preferences` | Object | `{"theme": "light", "notifications": true}` |
| `execution_log` | TemplateExecution[] | Array of execution history |
| `pending_schedules` | Object | `{"template-123": "2025-09-15T13:00:00.000Z"}` |

### Transaction Storage Example

```json
{
  "transactionId": "txn-789",
  "operations": [
    {
      "type": "set",
      "key": "template-123",
      "value": { "...template data..." },
      "timestamp": 1753309868728
    },
    {
      "type": "remove",
      "key": "template-old",
      "timestamp": 1753309868729
    }
  ],
  "status": "pending",
  "createdAt": "2025-08-01T14:30:00.000Z"
}
```

## Error Structures

### ApiError Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data",
    "details": {
      "field": "amount",
      "reason": "Amount must be greater than 0"
    },
    "timestamp": "2025-08-01T14:30:00.000Z",
    "requestId": "req-123"
  }
}
```

### TemplateError

```json
{
  "code": "TEMPLATE_NOT_FOUND",
  "message": "Template with ID 'template-999' not found",
  "templateId": "template-999",
  "timestamp": "2025-08-01T14:30:00.000Z"
}
```

## Chrome Alarm Metadata

```json
{
  "alarm_template_123": {
    "templateId": "template-123",
    "created": "2025-08-01T10:00:00.000Z",
    "nextExecution": "2025-09-15T13:00:00.000Z",
    "frequency": "monthly",
    "retryCount": 0,
    "lastError": null
  }
}
```

## Policy and Validation Structures

### PolicyDescription

```json
{
  "type": "MEALS_CLIENT",
  "name": "Client Meals",
  "description": "Meals with clients and prospects",
  "picture": "https://example.com/icons/meals.png",
  "warningAmounts": {
    "DAILY": {
      "USD": 150,
      "EUR": 130,
      "GBP": 120
    }
  },
  "requiresReceipt": true,
  "requiresParticipants": true,
  "glCodeRequired": true
}
```

## Custom Field Structures

```json
{
  "customFields": [
    {
      "id": "field-1",
      "name": "Cost Center",
      "type": "select",
      "required": true,
      "options": ["MKT-100", "ENG-200", "OPS-300"],
      "value": "MKT-100"
    },
    {
      "id": "field-2",
      "name": "Project Code",
      "type": "text",
      "required": false,
      "value": "PROJ-2025-08"
    }
  ]
}
```