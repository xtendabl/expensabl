---
id: task-9
title: Create Frequency-to-Minutes Converter
status: To Do
assignee: []
created_date: '2025-07-16'
labels: [utility, alarm]
dependencies: []
---

## Description

Single utility function to convert frequency strings to minutes

## Acceptance Criteria

- [ ] Function `getFrequencyMinutes(frequency)` returns correct minutes for: weekly, monthly, quarterly, yearly
- [ ] Function returns correct test minutes for: test-30s, test-1min, test-2min, test-5min, test-10min
- [ ] Function returns null for 'custom' frequency
- [ ] Function throws error for invalid frequency values
- [ ] Unit test validates all frequency conversions
- [ ] Function handles edge cases (null, undefined, empty string)

## Implementation Details

### Function Signature
```javascript
function getFrequencyMinutes(frequency) {
  return number|null;
}
```

### Expected Conversions
- 'weekly' → 10080 (7 * 24 * 60)
- 'monthly' → 43200 (30 * 24 * 60)
- 'quarterly' → 129600 (90 * 24 * 60)
- 'yearly' → 525600 (365 * 24 * 60)
- 'test-30s' → 0.5
- 'test-1min' → 1
- 'test-2min' → 2
- 'test-5min' → 5
- 'test-10min' → 10
- 'custom' → null
- Invalid input → throws Error

### Files to Modify
- Create utility function in background.js or separate file
- Add comprehensive unit tests

## Success Metrics
- Function completes in <1ms
- 100% test coverage for all frequency values
- Clear error messages for invalid inputs
