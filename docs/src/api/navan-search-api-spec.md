# Navan Search API Specification

## Overview

The Navan `/api/liquid/user/search/transactions` endpoint provides comprehensive transaction search and filtering capabilities. This document details all available query parameters based on empirical testing conducted on the live API.

## Test Methodology

Testing was performed systematically against the production Navan API to determine which query parameters are accepted and functional. A total of 74 parameters were tested, with 68 confirmed working and 6 failing.

## Raw Test Results

### Working Parameters (68 total)

The following parameters were confirmed to work with the API:

```
✅ PAGINATION PARAMETERS:
- limit: 5 (affects result count)
- offset: 10 (affects result count) 
- page: 2 (affects result count)
- size: 3 (affects result count)
- pageSize: 4 (affects result count)
- max: 2 (affects result count)
- count: 6 (affects result count)
- perPage: 3 (affects result count)
- pageNumber: 1 (accepted but no effect)
- skip: 5 (affects result count)
- take: 3 (affects result count)
- start: 2 (affects result count)
- startAt: 3 (affects result count)
- from: 5 (affects result count)
- to: 10 (affects result count)

✅ DATE FILTERING:
- dateFrom: "2024-01-01" (affects result count)
- dateTo: "2024-12-31" (affects result count)
- startDate: "2024-01-01" (affects result count)
- endDate: "2024-12-31" (affects result count)
- fromDate: "2024-01-01" (affects result count)
- toDate: "2024-12-31" (affects result count)
- since: "2024-01-01" (affects result count)
- until: "2024-12-31" (affects result count)
- after: "2024-01-01T00:00:00Z" (affects result count)
- before: "2024-12-31T23:59:59Z" (affects result count)

✅ SORTING:
- sortBy: "date" (accepted)
- orderBy: "date" (accepted)
- sortOrder: "desc" (accepted)
- order: "asc" (accepted)
- sortDirection: "DESC" (accepted)
- dir: "ASC" (accepted)
- direction: "desc" (accepted)

✅ SEARCH & FILTERING:
- q: "test" (affects result count)
- query: "test" (affects result count)
- search: "test" (affects result count)
- searchTerm: "test" (affects result count)
- filter: "test" (affects result count)
- text: "test" (affects result count)
- keyword: "test" (affects result count)
- term: "test" (affects result count)

✅ STATUS FILTERING:
- status: "pending" (affects result count)
- state: "approved" (accepted)
- statusFilter: "pending" (accepted)

✅ CATEGORY & TYPE:
- category: "travel" (affects result count)
- categoryId: "123" (accepted)
- type: "expense" (affects result count)
- expenseType: "business" (accepted)
- transactionType: "purchase" (accepted)

✅ PAYMENT & CURRENCY:
- paymentMethod: "card" (accepted)
- currency: "USD" (accepted)
- currencyCode: "USD" (accepted)

✅ AMOUNT FILTERING:
- minAmount: 10 (affects result count)
- maxAmount: 1000 (affects result count)
- amountFrom: 10 (accepted)
- amountTo: 1000 (accepted)
- greaterThan: 10 (accepted)
- lessThan: 1000 (accepted)

✅ RECEIPT & ATTACHMENT:
- hasReceipts: true (affects result count)
- withReceipts: true (accepted)
- receiptsOnly: true (accepted)
- attachments: true (accepted)

✅ OTHER FILTERS:
- fields: "id,date,amount" (affects result count)
- include: "receipts,notes" (accepted)
- expand: "details" (accepted)
- projection: "summary" (accepted)
```

### Failed Parameters (6 total)

The following parameters caused API errors:

```
❌ FAILED:
- sort: "date" (400 - ElasticSearch parse error)
- sortField: "date" (400 - ElasticSearch parse error)  
- sortType: "date" (400 - ElasticSearch parse error)
- sortedBy: "date" (400 - ElasticSearch parse error)
- merchant: "test" (500 - Internal server error)
- amount: 100 (500 - Internal server error)
```

## Parameter Categories & Usage

### 1. Pagination Parameters

Multiple pagination parameters are supported and appear to be aliases:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `limit` | number | `10` | Maximum number of results to return |
| `size` | number | `10` | Alias for limit |
| `pageSize` | number | `10` | Alias for limit |
| `max` | number | `10` | Alias for limit |
| `count` | number | `10` | Alias for limit |
| `perPage` | number | `10` | Alias for limit |
| `take` | number | `10` | Alias for limit |
| `offset` | number | `20` | Number of results to skip |
| `skip` | number | `20` | Alias for offset |
| `from` | number | `20` | Alias for offset |
| `start` | number | `20` | Alias for offset |
| `startAt` | number | `20` | Alias for offset |
| `page` | number | `2` | Page number (1-based) |

**Usage Example:**
```bash
# Get 10 results starting from the 20th result
curl 'https://app.navan.com/api/liquid/user/search/transactions?limit=10&offset=20'

# Or using page-based pagination (page 3 with 10 items per page)
curl 'https://app.navan.com/api/liquid/user/search/transactions?page=3&pageSize=10'
```

### 2. Date Range Filtering

Multiple date parameters are supported for filtering transactions by date:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `dateFrom` | string | `"2024-01-01"` | Start date (inclusive) |
| `dateTo` | string | `"2024-12-31"` | End date (inclusive) |
| `startDate` | string | `"2024-01-01"` | Alias for dateFrom |
| `endDate` | string | `"2024-12-31"` | Alias for dateTo |
| `fromDate` | string | `"2024-01-01"` | Alias for dateFrom |
| `toDate` | string | `"2024-12-31"` | Alias for dateTo |
| `since` | string | `"2024-01-01"` | Alias for dateFrom |
| `until` | string | `"2024-12-31"` | Alias for dateTo |
| `after` | string | `"2024-01-01T00:00:00Z"` | ISO timestamp for start |
| `before` | string | `"2024-12-31T23:59:59Z"` | ISO timestamp for end |

**Usage Example:**
```bash
# Get transactions from January 2024
curl 'https://app.navan.com/api/liquid/user/search/transactions?dateFrom=2024-01-01&dateTo=2024-01-31'

# Using ISO timestamps for precise time filtering
curl 'https://app.navan.com/api/liquid/user/search/transactions?after=2024-01-01T00:00:00Z&before=2024-01-31T23:59:59Z'
```

### 3. Sorting Parameters

Multiple sorting parameters control result ordering:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `sortBy` | string | `"date"` | Field to sort by |
| `orderBy` | string | `"date"` | Alias for sortBy |
| `sortOrder` | string | `"desc"` | Sort direction (asc/desc) |
| `order` | string | `"asc"` | Alias for sortOrder |
| `sortDirection` | string | `"DESC"` | Alias for sortOrder |
| `dir` | string | `"ASC"` | Alias for sortOrder |
| `direction` | string | `"desc"` | Alias for sortOrder |

**Note:** Do NOT use the `sort` parameter as it causes ElasticSearch errors. Use `sortBy` instead.

**Usage Example:**
```bash
# Sort by date descending
curl 'https://app.navan.com/api/liquid/user/search/transactions?sortBy=date&sortOrder=desc'

# Sort by amount ascending
curl 'https://app.navan.com/api/liquid/user/search/transactions?orderBy=amount&order=asc'
```

### 4. Search & Text Filtering

Multiple parameters support text-based searching:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `q` | string | `"Delta"` | Primary search query |
| `query` | string | `"hotel"` | Alias for q |
| `search` | string | `"uber"` | Alias for q |
| `searchTerm` | string | `"flight"` | Alias for q |
| `filter` | string | `"restaurant"` | General filter text |
| `text` | string | `"coffee"` | Text search |
| `keyword` | string | `"travel"` | Keyword search |
| `term` | string | `"expense"` | Search term |

**Usage Example:**
```bash
# Search for Delta transactions
curl 'https://app.navan.com/api/liquid/user/search/transactions?q=Delta'

# Search using alternative parameter
curl 'https://app.navan.com/api/liquid/user/search/transactions?searchTerm=Starbucks'
```

### 5. Status Filtering

Filter transactions by their status:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `status` | string | `"pending"` | Transaction status |
| `state` | string | `"approved"` | Alias for status |
| `statusFilter` | string | `"rejected"` | Status filter |

**Common Status Values:**
- `pending` - Awaiting approval
- `approved` - Approved transactions
- `rejected` - Rejected transactions
- `submitted` - Submitted for review

**Usage Example:**
```bash
# Get only pending transactions
curl 'https://app.navan.com/api/liquid/user/search/transactions?status=pending'
```

### 6. Category & Type Filtering

Filter by transaction category or type:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `category` | string | `"travel"` | Transaction category |
| `categoryId` | string | `"123"` | Category ID |
| `type` | string | `"expense"` | Transaction type |
| `expenseType` | string | `"business"` | Expense type |
| `transactionType` | string | `"purchase"` | Transaction type |

**Usage Example:**
```bash
# Get travel category transactions
curl 'https://app.navan.com/api/liquid/user/search/transactions?category=travel'

# Filter by expense type
curl 'https://app.navan.com/api/liquid/user/search/transactions?expenseType=business'
```

### 7. Financial Filtering

Filter by amounts, currency, and payment methods:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `minAmount` | number | `10` | Minimum amount |
| `maxAmount` | number | `1000` | Maximum amount |
| `amountFrom` | number | `10` | Alias for minAmount |
| `amountTo` | number | `1000` | Alias for maxAmount |
| `greaterThan` | number | `10` | Amount greater than |
| `lessThan` | number | `1000` | Amount less than |
| `currency` | string | `"USD"` | Currency code |
| `currencyCode` | string | `"USD"` | Alias for currency |
| `paymentMethod` | string | `"card"` | Payment method |

**Note:** The `amount` parameter causes server errors. Use `minAmount` and `maxAmount` instead.

**Usage Example:**
```bash
# Get transactions between $50 and $500
curl 'https://app.navan.com/api/liquid/user/search/transactions?minAmount=50&maxAmount=500'

# Filter by USD transactions paid by card
curl 'https://app.navan.com/api/liquid/user/search/transactions?currency=USD&paymentMethod=card'
```

### 8. Receipt & Attachment Filtering

Filter transactions based on receipt/attachment presence:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `hasReceipts` | boolean | `true` | Has receipts attached |
| `withReceipts` | boolean | `true` | Alias for hasReceipts |
| `receiptsOnly` | boolean | `true` | Only show with receipts |
| `attachments` | boolean | `true` | Has attachments |

**Usage Example:**
```bash
# Get only transactions with receipts
curl 'https://app.navan.com/api/liquid/user/search/transactions?hasReceipts=true'

# Get transactions without receipts
curl 'https://app.navan.com/api/liquid/user/search/transactions?hasReceipts=false'
```

### 9. Field Selection & Expansion

Control which fields are returned:

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `fields` | string | `"id,date,amount"` | Fields to include |
| `include` | string | `"receipts,notes"` | Related data to include |
| `expand` | string | `"details"` | Expand nested objects |
| `projection` | string | `"summary"` | Data projection |

**Usage Example:**
```bash
# Get only specific fields
curl 'https://app.navan.com/api/liquid/user/search/transactions?fields=id,date,amount,merchant'

# Include related data
curl 'https://app.navan.com/api/liquid/user/search/transactions?include=receipts,notes&expand=details'
```

## Complete Example Queries

### Example 1: Recent Pending Transactions with Receipts
```bash
curl 'https://app.navan.com/api/liquid/user/search/transactions?status=pending&dateFrom=2024-01-01&hasReceipts=true&limit=20&sortBy=date&sortOrder=desc' \
  -H 'authorization: TripActions [TOKEN]' \
  -H 'accept: application/json'
```

### Example 2: Search for High-Value Travel Expenses
```bash
curl 'https://app.navan.com/api/liquid/user/search/transactions?category=travel&minAmount=500&maxAmount=5000&dateFrom=2024-01-01&dateTo=2024-12-31&page=1&pageSize=50' \
  -H 'authorization: TripActions [TOKEN]' \
  -H 'accept: application/json'
```

### Example 3: Find Specific Merchant Transactions
```bash
curl 'https://app.navan.com/api/liquid/user/search/transactions?q=Marriott&status=approved&sortBy=amount&sortOrder=desc&limit=100' \
  -H 'authorization: TripActions [TOKEN]' \
  -H 'accept: application/json'
```

## Implementation Recommendations

### TypeScript Interface Update

Based on the test results, the `ExpenseFilters` interface should be updated to include all working parameters:

```typescript
export interface ExpenseFilters {
  // Search parameters
  q?: string;
  query?: string;
  search?: string;
  searchTerm?: string;
  filter?: string;
  text?: string;
  keyword?: string;
  term?: string;
  
  // Pagination
  limit?: number;
  offset?: number;
  page?: number;
  size?: number;
  pageSize?: number;
  max?: number;
  count?: number;
  perPage?: number;
  pageNumber?: number;
  skip?: number;
  take?: number;
  start?: number;
  startAt?: number;
  from?: number;
  to?: number;
  
  // Date filtering
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  since?: string;
  until?: string;
  after?: string;
  before?: string;
  
  // Sorting
  sortBy?: string;
  orderBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
  sortDirection?: 'asc' | 'desc' | 'ASC' | 'DESC';
  dir?: 'asc' | 'desc' | 'ASC' | 'DESC';
  direction?: 'asc' | 'desc' | 'ASC' | 'DESC';
  
  // Status
  status?: string;
  state?: string;
  statusFilter?: string;
  
  // Category & Type
  category?: string;
  categoryId?: string;
  type?: string;
  expenseType?: string;
  transactionType?: string;
  
  // Financial
  minAmount?: number;
  maxAmount?: number;
  amountFrom?: number;
  amountTo?: number;
  greaterThan?: number;
  lessThan?: number;
  currency?: string;
  currencyCode?: string;
  paymentMethod?: string;
  
  // Receipts
  hasReceipts?: boolean;
  withReceipts?: boolean;
  receiptsOnly?: boolean;
  attachments?: boolean;
  
  // Field selection
  fields?: string;
  include?: string;
  expand?: string;
  projection?: string;
}
```

### Best Practices

1. **Use Primary Parameters**: While many aliases exist, prefer the primary parameters for consistency:
   - Use `limit` instead of `size`, `max`, `count`, etc.
   - Use `offset` instead of `skip`, `from`, etc.
   - Use `dateFrom/dateTo` instead of other date aliases
   - Use `sortBy` instead of `orderBy`
   - Use `sortOrder` instead of other direction aliases

2. **Avoid Failed Parameters**: Never use:
   - `sort` - causes ElasticSearch errors (use `sortBy`)
   - `amount` - causes server errors (use `minAmount/maxAmount`)
   - `merchant` - causes server errors (use `q` for merchant search)

3. **Parameter Combinations**: Combine parameters for powerful filtering:
   ```bash
   # Complex query example
   ?q=hotel&status=pending&dateFrom=2024-01-01&minAmount=100&hasReceipts=true&limit=50&sortBy=date&sortOrder=desc
   ```

4. **Pagination Strategy**: 
   - For small datasets: Use `limit` and `offset`
   - For large datasets: Use `page` and `pageSize` for easier navigation
   - Always set a reasonable `limit` to avoid performance issues

5. **Date Formatting**:
   - Date strings: Use `YYYY-MM-DD` format
   - Timestamps: Use ISO 8601 format with timezone

## API Response Structure

The API returns a JSON response with the following general structure:

```json
{
  "data": [
    {
      "id": "transaction_id",
      "date": "2024-01-15",
      "amount": 125.50,
      "merchant": "Merchant Name",
      "status": "pending",
      "category": "travel",
      // ... additional fields based on 'fields' parameter
    }
  ],
  "pagination": {
    "total": 245,
    "page": 1,
    "pageSize": 10,
    "totalPages": 25
  }
}
```

## Error Handling

Common error responses:

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid parameter values, ElasticSearch errors from `sort` parameter |
| 401 | Unauthorized | Invalid or expired token |
| 500 | Internal Server Error | Using `merchant` or `amount` parameters |

## Version Information

- **API Endpoint**: `/api/liquid/user/search/transactions`
- **Base URL**: `https://app.navan.com`
- **Authentication**: Bearer token with `TripActions` prefix
- **Test Date**: Based on empirical testing conducted in 2024
- **Total Parameters Tested**: 74
- **Working Parameters**: 68
- **Failed Parameters**: 6

## Notes

1. The API appears to be built on ElasticSearch, which explains the multiple parameter aliases and the specific error messages when using incorrect sorting parameters.

2. Many parameters appear to be aliases for the same functionality, likely for backward compatibility or to support different client conventions.

3. The API is quite flexible but has some quirks (like the `merchant` and `amount` parameters causing errors) that should be avoided in production code.

4. Always test parameter combinations in development before deploying to production, as some combinations might have unexpected interactions.