---
id: task-7
title: Create Development Mode Detection Utility
status: To Do
assignee: []
created_date: '2025-07-16'
labels: [foundation, utility]
dependencies: []
---

## Description

Single utility function to detect development environment

## Acceptance Criteria

- [ ] Function `isDevelopment()` returns `true` when manifest name contains "dev" OR version contains "dev"
- [ ] Function `isDevelopment()` returns `false` for production builds
- [ ] Function works in both background.js and sidepanel.js contexts
- [ ] Unit test validates both true/false scenarios
- [ ] Function handles edge cases (undefined manifest values)

## Implementation Details

### Function Signature
```javascript
function isDevelopment() {
  return boolean;
}
```

### Test Cases
- Manifest name: "Navan Expense Automator - DEV" → returns true
- Manifest version: "1.0-dev" → returns true
- Manifest name: "Navan Expense Automator" → returns false
- Manifest version: "1.0" → returns false
- Undefined manifest → returns false

### Files to Modify
- Create new utility file or add to existing utilities
- Import in background.js and sidepanel.js

## Success Metrics
- Function completes in <1ms
- 100% test coverage
- No breaking changes to existing functionality
