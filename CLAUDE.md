# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a browser extension called "Expensabl" (formerly "Navan Expense Automator") that automates expense report submissions across multiple platforms (Navan, Concur, Expensify). The extension is built using Chrome Extension Manifest V3.

## Development Commands
Since this is a Chrome extension project, there are no traditional build/test commands. Development workflow:

1. **Loading the extension**: Load the extension in Chrome via `chrome://extensions/` in developer mode
2. **Testing**: Manual testing through the browser extension interface
3. **Debugging**: Use Chrome DevTools for background scripts, content scripts, and popup/sidepanel debugging

## Architecture Overview

### Core Components

**manifest.json**: Extension configuration defining permissions, content scripts, background service worker, and UI entry points.

**background.js**: Service worker that captures authentication tokens from network requests to Navan API and handles optional alarm scheduling for reminders.

**content.js**: Content script injected into expense platform pages. Handles API calls to fetch expense data using captured bearer tokens. Key functions:
- `getBearerToken()`: Retrieves stored auth token
- `fetchWithBearer()`: Makes authenticated API calls
- Message handlers for 'fetchExpense' and 'getSampledExpenses'

**popup.js/popup.html**: Simple popup interface with single button to open the side panel.

**sidepanel.js/sidepanel.html**: Main user interface with multi-step workflow:
- Step 1: Platform selection (Navan/Concur/Expensify)
- Step 2: Expense method selection (Template vs Manual)
- Step 2.5: Template selection (if using templates)
- Step 3: Display detailed expense information and creation

### Authentication Flow
1. User navigates to expense platform through extension
2. `background.js` intercepts Authorization headers and stores bearer token
3. `content.js` uses stored token for subsequent API calls
4. Token is persisted in `chrome.storage.local`

### API Integration
- Primary integration with Navan API (`app.navan.com/api/liquid/user/`)
- Endpoints: `/search/transactions` and `/expenses/{guid}`
- Uses captured "TripActions" bearer token for authentication

### File Structure and Responsibilities

#### Core Extension Files

**background.js**: Service worker responsible for:
- Intercepting and capturing "TripActions" bearer tokens from API requests to `app.navan.com`
- Storing authentication tokens in `chrome.storage.local` for later use
- Contains commented-out alarm scheduling functionality for expense reminders
- Runs persistently to monitor network requests for authentication data

**content.js**: Content script injected into expense platform pages that handles:
- API communication with Navan endpoints using stored bearer tokens
- Functions: `getBearerToken()`, `fetchWithBearer()`, `postExpenseWithBearer()`
- Message handling for actions: `fetchExpense`, `getSampledExpenses`, `createExpense`
- Template management operations: save, get, update, delete templates
- Template conversion and import/export functionality
- Storage usage calculations and template workflow management

**popup.js**: Simple popup interface containing:
- Single click handler to open the side panel
- Minimal functionality - just launches the main UI

**sidepanel.js**: Main user interface controller (1,200+ lines) managing:
- Multi-step expense creation workflow (platform selection, method selection, expense details)
- Template management system with CRUD operations
- Manual expense selection from Navan transactions
- Template-based expense creation with customization options
- Modal dialogs for template creation, editing, and import/export
- Success/error handling with user feedback
- Integration with content.js for API operations and template management

**template-manager.js**: Core template management system providing:
- Template data model and validation (following expense payload structure)
- CRUD operations for templates in Chrome storage
- Template import/export functionality with JSON format
- Storage quota management and size validation
- Template-to-expense payload conversion
- Validation rules for template fields and data integrity

#### Development and Testing Files

**manual_post.js**: Development reference file containing:
- Raw fetch request example for manual expense creation
- Sample expense payload structure with authentication headers
- Used for understanding API request format and testing

**manual_post2.js**: Additional development reference (similar to manual_post.js)

**add_receipt.js**: Development file for:
- Testing receipt upload functionality
- Multipart form data handling for PDF receipt uploads
- Reference for receipt attachment API integration

**get_expense.js**: Development utility for:
- Fetching individual expense details by GUID
- Testing expense retrieval API calls
- Understanding expense data structure

**get_again.js**: Development testing file for additional API exploration

**test.js**: Basic testing/debugging file for Node.js environment

#### Test Files (Various testing implementations)

**test-extension.js**: Extension-specific testing utilities
**test-storage-system.js**: Storage system testing
**test-storage-integration.js**: Storage integration testing
**test-template-manager.js**: Template manager functionality testing
**test-ui-integration.js**: UI integration testing
**test-workflow-integration.js**: Workflow integration testing
**test-api-integration.js**: API integration testing
**test-template-conversion.js**: Template conversion testing
**run-storage-tests.js**: Storage test runner
**simple-test.js**: Basic test implementation

#### UI Files
- **popup.html**: Simple popup interface with single button
- **sidepanel.html**: Main side panel interface container
- **Assets**: `icon.png` - Extension icon

## Key Extension Permissions
- `scripting`: For content script injection
- `storage`: For token persistence
- `webRequest`: For auth token interception
- `sidePanel`: For side panel UI
- `alarms`, `notifications`: For scheduled reminders (currently disabled)

## Development Notes
- Uses Chrome Extension Manifest V3 with service worker architecture
- No external dependencies or build process
- Direct DOM manipulation and Chrome APIs
- Async/await pattern for API calls and Chrome extension APIs

## User Interface Flow

### Expected User Journey

The extension follows a multi-step workflow designed to guide users through expense creation:

#### Step 1: Platform Selection (`renderStep1()`)
- **Purpose**: User selects their expense platform (Navan, Concur, or Expensify)
- **UI Elements**:
  - Platform dropdown with options: Navan, Concur, Expensify
  - Status messages for navigation and authentication
  - "Continue" button (appears after platform selection)
- **Process**:
  1. User selects platform from dropdown
  2. Extension navigates active tab to platform URL
  3. User authenticates with the platform
  4. User clicks "Continue" to proceed to Step 2

#### Step 2: Method Selection (`renderStep2()`)
- **Purpose**: User chooses between template-based or manual expense creation
- **UI Elements**:
  - "Use Template" button (blue) - leads to Step 2.5
  - "Manual Entry" button (green) - leads to manual expense selection
- **Process**:
  1. User clicks "Use Template" → goes to Step 2.5 (Template Selection)
  2. User clicks "Manual Entry" → goes to manual expense selection

#### Step 2.5: Template Selection (`renderStep2_5_TemplateSelection()`)
- **Purpose**: User selects from existing templates or manages templates
- **UI Elements**:
  - "← Back to Method Selection" button
  - Template cards showing: name, description, amount, merchant, frequency
  - "Use Template" button on each card
  - "Manage Templates" button (blue)
  - "Skip & Use Manual" button (yellow)
- **Process**:
  1. User clicks "Use Template" on a card → goes to Step 3 (from template)
  2. User clicks "Manage Templates" → goes to template management interface
  3. User clicks "Skip & Use Manual" → goes to manual expense selection
  4. User clicks "← Back to Method Selection" → returns to Step 2

#### Template Management Interface (`renderTemplateManagement()`)
- **Purpose**: Users can view, edit, delete, import, and export templates
- **UI Elements**:
  - Template list with Edit/Delete buttons for each template
  - "Add New Template" button (green)
  - "Export Templates" button (blue)
  - "Import Templates" button (yellow)
  - "Back" button to return to template selection
- **Process**:
  1. User clicks "Edit" → opens edit template modal
  2. User clicks "Delete" → confirms deletion
  3. User clicks "Export Templates" → downloads JSON file
  4. User clicks "Import Templates" → opens import modal
  5. User clicks "Back" → returns to Step 2.5

#### Manual Expense Selection (`renderManualExpenseSelection()`)
- **Purpose**: User selects from existing Navan transactions
- **UI Elements**:
  - Dropdown showing available transactions (merchant name and amount)
  - "Continue" button to proceed with selected transaction
- **Process**:
  1. User selects transaction from dropdown
  2. User clicks "Continue" → goes to Step 3 (from transaction)

#### Step 3: Expense Details and Creation (`renderStep3()` or `renderStep3FromTemplate()`)
- **Purpose**: Review expense details and create the expense
- **UI Elements**:
  - Expense details display (JSON format)
  - "Save as Template" button (green) - only for manual expenses
  - "Create Expense" button (blue)
  - For template-based: "Edit Template" and "Save as New Template" buttons
- **Process**:
  1. User reviews expense details
  2. User clicks "Save as Template" → opens save template modal
  3. User clicks "Create Expense" → submits expense to API
  4. Success/error modal appears with results

### Button Interactions Summary

| Button | Location | Action | Destination |
|--------|----------|--------|-------------|
| Continue (Step 1) | Step 1 | Proceed after platform auth | Step 2 |
| Use Template | Step 2 | Choose template workflow | Step 2.5 |
| Manual Entry | Step 2 | Choose manual workflow | Manual Selection |
| ← Back to Method Selection | Step 2.5 | Return to method choice | Step 2 |
| Use Template (card) | Step 2.5 | Select specific template | Step 3 (template) |
| Manage Templates | Step 2.5 | Open template management | Template Management |
| Skip & Use Manual | Step 2.5 | Bypass templates | Manual Selection |
| Back | Template Management | Return to template selection | Step 2.5 |
| Continue (manual) | Manual Selection | Proceed with selected transaction | Step 3 (manual) |
| Create Expense | Step 3 | Submit expense to API | Success/Error Modal |
| Save as Template | Step 3 | Save current expense as template | Save Template Modal |

### Modal Interactions

- **Save Template Modal**: Name, description, frequency input → saves template
- **Edit Template Modal**: Modify existing template details → updates template
- **Import Templates Modal**: File upload for template import → imports templates
- **Success Modal**: Shows expense creation result → option to create another
- **Error Modal**: Shows error details → option to try again

### Expected Data Flow

1. **Authentication**: Bearer token captured by background.js and stored
2. **Transaction Fetch**: content.js retrieves available transactions via API
3. **Template Operations**: Templates stored in Chrome extension storage
4. **Expense Creation**: Final expense payload submitted to Navan API
5. **Feedback**: Success/error responses displayed to user

<!-- BACKLOG.MD GUIDELINES START -->
# Instructions for the usage of Backlog.md CLI Tool

## 1. Source of Truth

- Tasks live under **`backlog/tasks/`** (drafts under **`backlog/drafts/`**).
- Every implementation decision starts with reading the corresponding Markdown task file.
- Project documentation is in **`backlog/docs/`**.
- Project decisions are in **`backlog/decisions/`**.

## 2. Defining Tasks

### **Title**

Use a clear brief title that summarizes the task.

### **Description**: (The **"why"**)

Provide a concise summary of the task purpose and its goal. Do not add implementation details here. It
should explain the purpose and context of the task. Code snippets should be avoided.

### **Acceptance Criteria**: (The **"what"**)

List specific, measurable outcomes that define what means to reach the goal from the description. Use checkboxes (`- [ ]`) for tracking.
When defining `## Acceptance Criteria` for a task, focus on **outcomes, behaviors, and verifiable requirements** rather
than step-by-step implementation details.
Acceptance Criteria (AC) define *what* conditions must be met for the task to be considered complete.
They should be testable and confirm that the core purpose of the task is achieved.
**Key Principles for Good ACs:**

- **Outcome-Oriented:** Focus on the result, not the method.
- **Testable/Verifiable:** Each criterion should be something that can be objectively tested or verified.
- **Clear and Concise:** Unambiguous language.
- **Complete:** Collectively, ACs should cover the scope of the task.
- **User-Focused (where applicable):** Frame ACs from the perspective of the end-user or the system's external behavior.

    - *Good Example:* "- [ ] User can successfully log in with valid credentials."
    - *Good Example:* "- [ ] System processes 1000 requests per second without errors."
    - *Bad Example (Implementation Step):* "- [ ] Add a new function `handleLogin()` in `auth.ts`."

### Task file

Once a task is created it will be stored in `backlog/tasks/` directory as a Markdown file with the format
`task-<id> - <title>.md` (e.g. `task-42 - Add GraphQL resolver.md`).

### Additional task requirements

- Tasks must be **atomic** and **testable**. If a task is too large, break it down into smaller subtasks.
  Each task should represent a single unit of work that can be completed in a single PR.

- **Never** reference tasks that are to be done in the future or that are not yet created. You can only reference
  previous
  tasks (id < current task id).

- When creating multiple tasks, ensure they are **independent** and they do not depend on future tasks.   
  Example of wrong tasks splitting: task 1: "Add API endpoint for user data", task 2: "Define the user model and DB
  schema".  
  Example of correct tasks splitting: task 1: "Add system for handling API requests", task 2: "Add user model and DB
  schema", task 3: "Add API endpoint for user data".

## 3. Recommended Task Anatomy

```markdown
# task‑42 - Add GraphQL resolver

## Description (the why)

Short, imperative explanation of the goal of the task and why it is needed.

## Acceptance Criteria (the what)

- [ ] Resolver returns correct data for happy path
- [ ] Error response matches REST
- [ ] P95 latency ≤ 50 ms under 100 RPS

## Implementation Plan (the how) (added after starting work on a task)

1. Research existing GraphQL resolver patterns
2. Implement basic resolver with error handling
3. Add performance monitoring
4. Write unit and integration tests
5. Benchmark performance under load

## Implementation Notes (only added after finishing work on a task)

- Approach taken
- Features implemented or modified
- Technical decisions and trade-offs
- Modified or added files
```

## 6. Implementing Tasks

Mandatory sections for every task:

- **Implementation Plan**: (The **"how"**) Outline the steps to achieve the task. Because the implementation details may
  change after the task is created, **the implementation plan must be added only after putting the task in progress**
  and before starting working on the task.
- **Implementation Notes**: Document your approach, decisions, challenges, and any deviations from the plan. This
  section is added after you are done working on the task. It should summarize what you did and why you did it. Keep it
  concise but informative.

**IMPORTANT**: Do not implement anything else that deviates from the **Acceptance Criteria**. If you need to
implement something that is not in the AC, update the AC first and then implement it or create a new task for it.

## 2. Typical Workflow

```bash
# 1 Identify work
backlog task list -s "To Do" --plain

# 2 Read details & documentation
backlog task 42 --plain
# Read also all documentation files in `backlog/docs/` directory.
# Read also all decision files in `backlog/decisions/` directory.

# 3 Start work: assign yourself & move column
backlog task edit 42 -a @{yourself} -s "In Progress"

# 4 Add implementation plan before starting
backlog task edit 42 --plan "1. Analyze current implementation\n2. Identify bottlenecks\n3. Refactor in phases"

# 5 Break work down if needed by creating subtasks or additional tasks
backlog task create "Refactor DB layer" -p 42 -a @{yourself} -d "Description" --ac "Tests pass,Performance improved"

# 6 Complete and mark Done
backlog task edit 42 -s Done --notes "Implemented GraphQL resolver with error handling and performance monitoring"
```

### 7. Final Steps Before Marking a Task as Done

Always ensure you have:

1. ✅ Marked all acceptance criteria as completed (change `- [ ]` to `- [x]`)
2. ✅ Added an `## Implementation Notes` section documenting your approach
3. ✅ Run all tests and linting checks
4. ✅ Updated relevant documentation

## 8. Definition of Done (DoD)

A task is **Done** only when **ALL** of the following are complete:

1. **Acceptance criteria** checklist in the task file is fully checked (all `- [ ]` changed to `- [x]`).
2. **Implementation plan** was followed or deviations were documented in Implementation Notes.
3. **Automated tests** (unit + integration) cover new logic.
4. **Static analysis**: linter & formatter succeed.
5. **Documentation**:
    - All relevant docs updated (any relevant README file, backlog/docs, backlog/decisions, etc.).
    - Task file **MUST** have an `## Implementation Notes` section added summarising:
        - Approach taken
        - Features implemented or modified
        - Technical decisions and trade-offs
        - Modified or added files
6. **Review**: self review code.
7. **Task hygiene**: status set to **Done** via CLI (`backlog task edit <id> -s Done`).
8. **No regressions**: performance, security and licence checks green.

⚠️ **IMPORTANT**: Never mark a task as Done without completing ALL items above.

## 9. Handy CLI Commands

| Purpose          | Command                                                                |
|------------------|------------------------------------------------------------------------|
| Create task      | `backlog task create "Add OAuth"`                                      |
| Create with desc | `backlog task create "Feature" -d "Enables users to use this feature"` |
| Create with AC   | `backlog task create "Feature" --ac "Must work,Must be tested"`        |
| Create with deps | `backlog task create "Feature" --dep task-1,task-2`                    |
| Create sub task  | `backlog task create -p 14 "Add Google auth"`                          |
| List tasks       | `backlog task list --plain`                                            |
| View detail      | `backlog task 7 --plain`                                               |
| Edit             | `backlog task edit 7 -a @{yourself} -l auth,backend`                   |
| Add plan         | `backlog task edit 7 --plan "Implementation approach"`                 |
| Add AC           | `backlog task edit 7 --ac "New criterion,Another one"`                 |
| Add deps         | `backlog task edit 7 --dep task-1,task-2`                              |
| Add notes        | `backlog task edit 7 --notes "We added this and that feature because"` |
| Mark as done     | `backlog task edit 7 -s "Done"`                                        |
| Archive          | `backlog task archive 7`                                               |
| Draft flow       | `backlog draft create "Spike GraphQL"` → `backlog draft promote 3.1`   |
| Demote to draft  | `backlog task demote <task-id>`                                        |

## 10. Tips for AI Agents

- **Always use `--plain` flag** when listing or viewing tasks for AI-friendly text output instead of using Backlog.md
  interactive UI.
- When users mention to create a task, they mean to create a task using Backlog.md CLI tool.

<!-- BACKLOG.MD GUIDELINES END -->
