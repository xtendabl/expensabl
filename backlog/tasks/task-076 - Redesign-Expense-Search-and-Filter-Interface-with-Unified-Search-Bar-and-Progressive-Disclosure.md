---
id: task-076
title: >-
  Redesign Expense Search and Filter Interface with Unified Search Bar and
  Progressive Disclosure
status: To Do
assignee: []
created_date: '2025-08-11'
labels: []
dependencies: []
---

## Description

The current expense search and filter interface needs to be redesigned to provide a cleaner, more intuitive user experience. The new design should consolidate the search and filter options into a single, cohesive interface with improved visual hierarchy, progressive disclosure of advanced options, and better use of space.

## Key Improvements Required

### Search Area
- Unified search bar that handles merchants, amounts, descriptions, and transaction IDs
- Smart placeholder text that guides users on what they can search for
- Prominent placement at the top with a clean, modern design

### Filter Area
- Horizontal layout that's more compact and scannable
- Date range picker with common presets (Last 30 days, This month, etc.) instead of separate date fields
- Grouped related filters with clear visual hierarchy
- "More filters" toggle for advanced options, keeping the interface clean by default

### Progressive Disclosure
- Advanced filters are hidden initially but expand when needed
- Grid layout for advanced options makes better use of space
- Clear visual separation between basic and advanced functionality

### Enhanced Usability
- Quick actions (Export, Add Expense) are easily accessible
- Results summary shows what's currently displayed
- Improved visual hierarchy with better typography and spacing
- Mobile-responsive design that stacks filters vertically on smaller screens

## Visual Reference
See `backlog/screenshots/desired_ui.png` for the visual mockup.

## Reference HTML Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expense Interface Prototype</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8f9fa;
            color: #333;
            line-height: 1.5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .page-title {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
        }

        /* Enhanced Search Bar */
        .search-container {
            position: relative;
            margin-bottom: 20px;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 44px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s ease;
            background: white;
        }

        .search-input:focus {
            outline: none;
            border-color: #4285f4;
            box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
        }

        .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #6b7280;
            width: 16px;
            height: 16px;
        }

        /* Compact Filter Bar */
        .filter-bar {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }

        .filter-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .filter-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
        }

        .filter-select, .date-range-picker {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: white;
            font-size: 14px;
            cursor: pointer;
            transition: border-color 0.2s ease;
        }

        .filter-select:hover, .date-range-picker:hover {
            border-color: #9ca3af;
        }

        .date-range-picker {
            min-width: 140px;
        }

        .advanced-toggle {
            color: #4285f4;
            background: none;
            border: none;
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
            margin-left: auto;
        }

        /* Quick Actions */
        .quick-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .btn-primary {
            background: #4285f4;
            color: white;
        }

        .btn-primary:hover {
            background: #3367d6;
        }

        .btn-secondary {
            background: #f8f9fa;
            color: #5f6368;
            border: 1px solid #dadce0;
        }

        .btn-secondary:hover {
            background: #f1f3f4;
        }

        /* Results Summary */
        .results-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .results-count {
            font-size: 14px;
            color: #6b7280;
        }

        /* Advanced Filters (Hidden by default) */
        .advanced-filters {
            display: none;
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .advanced-filters.open {
            display: block;
        }

        .advanced-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .form-group label {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
        }

        .form-group input, .form-group select {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
            }

            .filter-group {
                justify-content: space-between;
            }

            .quick-actions {
                margin-top: 12px;
            }

            .results-summary {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="page-title">My Expenses</h1>
            
            <!-- Enhanced Search -->
            <div class="search-container">
                <svg class="search-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
                <input type="text" class="search-input" placeholder="Search by merchant, amount, description, or transaction ID...">
            </div>
            
            <!-- Compact Filter Bar -->
            <div class="filter-bar">
                <div class="filter-group">
                    <span class="filter-label">Date Range:</span>
                    <select class="date-range-picker">
                        <option>Last 30 days</option>
                        <option>This month</option>
                        <option>Last month</option>
                        <option>Last 3 months</option>
                        <option>This year</option>
                        <option>Custom range...</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <span class="filter-label">Category:</span>
                    <select class="filter-select">
                        <option>All Categories</option>
                        <option>Travel</option>
                        <option>Meals</option>
                        <option>Office</option>
                        <option>Other</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <span class="filter-label">Status:</span>
                    <select class="filter-select">
                        <option>All Status</option>
                        <option>Approved</option>
                        <option>Submitted</option>
                        <option>Draft</option>
                    </select>
                </div>
                
                <button class="advanced-toggle" onclick="toggleAdvanced()">More filters</button>
                
                <div class="quick-actions">
                    <button class="btn btn-secondary">Export</button>
                    <button class="btn btn-primary">Add Expense</button>
                </div>
            </div>
            
            <!-- Advanced Filters (Hidden) -->
            <div class="advanced-filters" id="advancedFilters">
                <div class="advanced-grid">
                    <div class="form-group">
                        <label>Merchant Name</label>
                        <input type="text" placeholder="e.g. Delta Airlines">
                    </div>
                    <div class="form-group">
                        <label>Amount Range</label>
                        <input type="text" placeholder="$0 - $1000">
                    </div>
                    <div class="form-group">
                        <label>Project</label>
                        <select>
                            <option>All Projects</option>
                            <option>Q4 Marketing</option>
                            <option>Product Launch</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Receipt Status</label>
                        <select>
                            <option>Any</option>
                            <option>Has Receipt</option>
                            <option>Missing Receipt</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Results Summary -->
        <div class="results-summary">
            <span class="results-count">Showing 5 of 8 expenses</span>
            <div class="quick-actions">
                <button class="btn btn-secondary">Clear Filters</button>
            </div>
        </div>
    </div>

    <script>
        function toggleAdvanced() {
            const filters = document.getElementById('advancedFilters');
            const toggle = document.querySelector('.advanced-toggle');
            
            if (filters.classList.contains('open')) {
                filters.classList.remove('open');
                toggle.textContent = 'More filters';
            } else {
                filters.classList.add('open');
                toggle.textContent = 'Hide filters';
            }
        }
    </script>
</body>
</html>
```

## Acceptance Criteria

- [ ] Unified search bar accepts merchants/amounts/descriptions/transaction IDs in a single input
- [ ] Search input includes smart placeholder text guiding users on searchable fields
- [ ] Search icon is prominently displayed within the search input field
- [ ] Date range picker provides preset options (Last 30 days/This month/Last month/etc)
- [ ] Category and Status filters are displayed inline in a horizontal layout
- [ ] Filters have clear visual labels and consistent styling
- [ ] Advanced filters are hidden by default behind a 'More filters' toggle
- [ ] Advanced filters expand in a grid layout when toggled
- [ ] Export and Add Expense buttons are positioned in the header area
- [ ] Results summary displays current filter state and result count
- [ ] Clear Filters button is available when any filters are active
- [ ] Interface uses clean white card design with subtle shadows
- [ ] Typography and spacing follow the mockup design system
- [ ] Interface is fully responsive and stacks vertically on mobile
- [ ] All existing search and filter functionality continues to work
- [ ] No console errors occur when using the interface
- [ ] HTML mockup provided in task description is used as implementation reference
