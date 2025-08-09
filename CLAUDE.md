# CLAUDE.md 

This `CLAUDE.md` file is designed to provide **deep and persistent context** to Claude for all development tasks related to the Expensabl Chrome Extension. It serves as a single source of truth for project understanding, development guidelines, and specific instructions for effective interaction with this codebase.

-----

## 1. Project Core Identity & Purpose

Expensabl is a **Chrome extension** focused on simplifying **expense management and tracking** on the Navan platform. Its primary function is to allow users to quickly add and categorize expenses, often directly from web pages, and manage recurring expenses. The extension operates within the browser environment, leveraging Chrome APIs for persistence, background operations, and UI integration.

**Key User Flows:**

  * **Quick Expense Entry:** Users can open the side panel and log an expense with details.
  * **Webpage Contextual Expense Creation:** The content script enables adding expenses directly from selected text or data on a webpage.
  * **Template Management:** Users can create and apply expense templates for recurring or common expenses.
  * **Receipt Management:** Users can upload, view, and delete receipts associated with expenses.
  * **Expense Duplication:** Users can duplicate existing expenses with modifications.
  * **Background Synchronization:** The service worker handles synchronization with a backend API (specifically, the Navan platform, via token capture).

-----

## 2. Core Technology Stack & Dependencies

  * **Language:** Predominantly **TypeScript**. All new code and significant refactoring should prioritize TypeScript for type safety and maintainability.
  * **Build Tool:** **Webpack** is used for bundling, transpiling TypeScript, and handling assets. Key configuration is in `webpack.config.js`.
  * **Testing Framework:** **Jest** is used for unit and integration tests, with `ts-jest` for TypeScript support. Comprehensive test coverage with `__tests__` directories throughout the codebase.
  * **Documentation:** **mdbook** is used for generating and serving documentation.
  * **State Management:**
      * **Chrome Storage API (`chrome.storage.local` / `sync`):** The primary mechanism for persistent state. Handled via `src/shared/services/storage/providers/chrome-storage.ts` (abstracted by `src/shared/services/storage/`).
      * **In-Memory State:** Ephemeral UI state within the side panel managed by `ExpenseStore` (`src/chrome/domains/expenses/state/expense-store.ts`).
  * **Communication:** A custom, robust **message passing system** using `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` for inter-component communication (Service Worker ⇔ Side Panel ⇔ Content Script) via `message-adapter.ts`.
  * **HTTP Client:** Custom `ApiHttpClient` with built-in retry logic (`src/features/expenses/http/http-client.ts`) and response normalization (`response-normalizer.ts`).
  * **Linting/Formatting:** **ESLint** and **Prettier** are enforced via `husky` pre-commit hooks.

-----

## 3. Architecture Overview

This codebase follows a layered architecture with clear separation of concerns, designed as a Manifest V3 Chrome extension.

### 3.1. Core Components

1.  **Chrome Extension Layer** (`src/chrome/`)

      * `service-worker.ts` - Background service worker that acts as the **brain** of the extension. It handles message routing, token capture (via webRequest API monitoring Navan API calls), all external API calls, scheduled tasks, and manages global state.
      * `content.ts` - Content script injected into specific Navan pages. Responsible for token interception, injecting UI elements onto the webpage, extracting data from the DOM, and communicating relevant information to the service worker.
      * `sidepanel.ts` - The UI entry point for the Chrome Side Panel. It initializes the user interface and communicates with the service worker for all data requests and actions.
      * `sidepanel-ui.ts` - Manages all UI interactions and event handling for the sidepanel, including state management and user event processing.
      * `message-adapter.ts` - The central utility for facilitating message-based communication between different extension contexts (service worker, side panel, content script).

2.  **Features Layer** (`src/features/`)

      * **auth/** - Manages user authentication state, token capture, token validation, and secure storage of authentication tokens. Includes validators for token integrity.
      * **expenses/** - Contains the core logic for expense management:
          * `http/` - HTTP clients with request building, response normalization, and robust retry policies
          * `services/` - Core business logic including `expense-operations.ts` and `field-configuration-service.ts`
          * `mappers/` - Data transformation utilities, particularly `search-transaction-mapper.ts`
          * `config/` - API configuration settings
          * `constants/` - Policy types and other constants
          * `types/` - SearchTransaction types and comprehensive expense type definitions
          * `errors.ts` - Specific error types for expense operations
      * **messaging/** - Implements the typed message routing system:
          * `router.ts` - Central message routing logic
          * `handlers/` - Organized handler functions by domain (expense/, template/, token/, ui/)
          * `typed-registry.ts` - Type-safe handler registration
          * `service-container.ts` - Dependency injection container
          * `transport.ts` - Message transport layer
      * **templates/** - Handles the creation, storage, and application of expense templates:
          * `scheduling-engine.ts` - Integrates with Chrome alarms for recurring expenses
          * `repositories/` - Data persistence layer for templates
          * `factories/` - Template creation factories
          * `validator.ts` - Template validation logic

3.  **Shared Services** (`src/shared/`)

      * **logger/** - An environment-aware logging utility that adapts between development (console output) and production (logging to Chrome storage for persistence and later analysis) modes.
      * **storage/** - Provides an abstraction layer over the Chrome Storage API:
          * `providers/` - Chrome storage and memory storage implementations
          * `transaction/` - Transaction support for reliable data persistence
          * `interfaces/` - Storage provider contracts
      * **types/** - Contains all common type definitions, including interfaces for data models, API payloads, and the crucial **message formats** used throughout the extension.
      * **utils/** - A collection of general utility functions to avoid code duplication.

4.  **Chrome Domains** (`src/chrome/domains/`)

      * **expenses/** - Domain-specific UI logic for expenses:
          * `components/` - Expense UI components (expense-card, expense-list, expense-detail-with-receipt)
          * `services/` - UI-specific services like `expense-ui-service.ts`
          * `state/` - State management with `expense-store.ts`

5.  **UI Components** (`src/chrome/components/`)

      * **modals/** - Comprehensive modal system:
          * `modal-manager.ts` - Centralized modal state management
          * `authentication-modal.ts` - User authentication UI
          * `receipt-upload-modal.ts` - Receipt upload functionality
          * `receipt-selection-modal.ts` - Receipt selection interface
          * `submit-draft-modal.ts` - Draft expense submission
          * `amount-modification-modal.ts` - Amount editing interface
      * **workflows/** - Complex user workflows:
          * `expense-duplication-workflow.ts` - Handles expense duplication flow
      * **builders/** - UI content builders:
          * `help-content-builder.ts` - Generates help content dynamically
      * `field-settings.ts` - Field configuration UI
      * `template-card.ts`, `template-editor.ts`, `template-list.ts` - Template management UI

### 3.2. Key Architectural Patterns

  * **Singleton Services**: Emphasizes the use of pre-configured service instances (e.g., `expenseManager`, `getDefaultServiceContainer()`) instead of static classes, ensuring consistent behavior and state across the application.
  * **Service Container Pattern**: The `ServiceContainer` class (`src/features/messaging/service-container.ts`) provides centralized dependency injection and service lifecycle management.
  * **Message-Based Architecture**: All inter-component communication within the extension (Service Worker, Side Panel, Content Script) is strictly performed using typed messages routed through `features/messaging/router.ts`. Direct access to Chrome APIs from UI/Content scripts is avoided.
  * **Handler Pattern**: Each specific message action or command has a dedicated handler function located in `features/messaging/handlers/`, promoting a clean, extensible, and testable message processing system.
  * **Messaging Facade**: The `messagingFacade` (`src/chrome/shared/services/messaging-facade.ts`) provides a simplified interface for UI components to communicate with the backend.
  * **Domain-Driven Design**: UI logic is organized by domains (`src/chrome/domains/`) for better separation of concerns.
  * **Factory Pattern**: Used for creating complex objects like templates via `TemplateServiceFactory`.
  * **Repository Pattern**: Data persistence abstraction via repositories (e.g., `template.repository.ts`).

### 3.3. Important Implementation Details

  * **Token Capture:** Authentication tokens are captured passively by the service worker by monitoring specific Navan API calls using the Chrome `webRequest` API. This is a critical security and functional aspect.
  * **Robust API Operations:** All external API calls are centralized through `ApiHttpClient` which includes:
      * Built-in retry logic with configurable retry policies
      * Response normalization for consistent data handling
      * Request building with proper headers and authentication
  * **Receipt Management:** Integrated receipt operations including upload, deletion, and URL retrieval through the expense service.
  * **Scheduled Templates:** Recurring expense templates leverage the `chrome.alarms` API for precise, background scheduling of expense creation.
  * **State Management:** ExpenseStore provides Redux-like state management for UI components with actions and reducers.
  * **Field Configuration:** Dynamic field configuration via `FieldConfigurationService` for customizable expense forms.
  * **Code Quality Enforcement:** `husky` pre-commit hooks automatically run `npm run format:fix` (Prettier) and `npm test` before every commit, ensuring consistent code style and preventing regressions.

### 3.4. Chrome Extension Specifics

  * **Manifest V3 Extension:** The project is built on Manifest V3, utilizing its service worker model.
  * **Required Permissions:** The extension declares specific permissions in `manifest.json`: `storage`, `tabs`, `activeTab`, `sidePanel`, `webRequest`, `notifications`, `alarms`. **Always consult `manifest.json` when adding new features that may require additional browser capabilities.**
  * **Host Permission:** Explicitly requires host permission for `https://app.navan.com/*` to enable content script injection and webRequest monitoring on Navan pages.
  * **Side Panel UI:** The primary user interface is integrated as a Chrome Side Panel built with vanilla TypeScript components.

### 3.5. Modal System

The extension implements a comprehensive modal system for user interactions:

  * **Modal Manager:** Centralized modal state and lifecycle management
  * **Modal Types:**
      * **Authentication Modal:** User login and token management
      * **Receipt Upload Modal:** File upload interface for receipts
      * **Receipt Selection Modal:** Choose from existing receipts
      * **Submit Draft Modal:** Finalize and submit draft expenses
      * **Amount Modification Modal:** Edit expense amounts with validation
  * **Modal Testing:** Comprehensive test coverage for all modal types
  * **Modal CSS:** Styled with `modal.css` for consistent appearance

### 3.6. Type System

The project maintains a comprehensive type system:

  * **Global Types:** `src/types/globals.d.ts` for global type definitions
  * **Domain Types:** 
      * `User` - Complete user profile with permissions and settings
      * `Expense/NavanExpenseData` - Core expense data structures
      * `SearchTransaction` - Search-specific transaction types
      * `ExpenseFilters` - Filtering and search parameters
      * `ExpenseCreatePayload` - Expense creation data structures
  * **Message Types:** Strictly typed message formats for inter-component communication
  * **Type Exports:** Consistent pattern of type exports throughout modules

-----

## 4. Common Developer Commands

### 4.1. Build Commands

  * `npm run build` - Performs a production build. This command first runs all tests (`npm test`) and then executes the Webpack production build, generating optimized and minified output in the `dist/` directory.
  * `npm run build:dev` - Creates a development build with source maps enabled for easier debugging.
  * `npm run watch` - Initiates a development build that automatically rebuilds the project whenever file changes are detected, providing a rapid feedback loop during development.

### 4.2. Testing

  * `npm test` - Executes all unit and integration tests defined in the codebase.
  * `npm run test:watch` - Runs tests in watch mode, automatically rerunning relevant tests when code changes.
  * `npm run test:coverage` - Runs all tests and generates a detailed code coverage report, highlighting areas with insufficient test coverage.

### 4.3. Code Quality

  * `npm run lint:fix` - Automatically fixes most linting issues, including import sorting and detecting/removing unused imports, using ESLint.
  * `npm run format:fix` - A comprehensive command that automatically fixes all formatting (via Prettier) and linting issues.
  * `npm run sort:imports` - Specifically sorts and organizes import statements.
  * **Pre-commit Hook:** The `format:fix` command is automatically run by a `husky` pre-commit hook before every commit, ensuring code quality standards are maintained.

### 4.4. Documentation

  * `npm run docs:build` - Builds the documentation using mdbook.
  * `npm run docs:serve` - Serves the documentation locally and opens it in the browser.
  * `npm run docs:watch` - Watches for documentation changes and auto-rebuilds.

### 4.5. Development Utilities

  * `npm run clean` - A utility command to remove generated build artifacts by deleting the `dist/` and `node_modules/` directories, useful for a clean slate.

-----

## 5. Common Development Workflows & Claude Instructions

### 5.1. Adding a New Feature (End-to-End Workflow)

When asked to implement a new feature, follow this comprehensive process:

1.  **Analyze `manifest.json`:** First, determine if the new feature requires any new Chrome API permissions or host permissions. Update `manifest.json` if necessary.
2.  **Define Message Types:** If the UI (Side Panel) or Content Script needs to interact with the Service Worker for this feature, define clear, new message types in `src/shared/types/messages.ts`.
3.  **Service Worker Handler:** Create a new, dedicated message handler in `src/features/messaging/handlers/` (or extend an existing one if highly relevant). Register it in `typed-registry.ts`. This handler will encapsulate the core business logic, orchestrate API calls, and manage state updates related to the new feature.
4.  **API Client (if applicable):** If the feature requires interaction with external APIs, create or update the relevant HTTP client within `src/features/[feature-name]/http/` to define the necessary API endpoints and data structures. Implement retry policies and response normalization as needed.
5.  **State Management:** Update relevant state managers within `src/features/[feature-name]/state/` or `src/chrome/domains/[domain]/state/` to accurately store and retrieve data pertinent to the new feature's state.
6.  **UI/Content Script Integration:** Implement the necessary user interface logic in `src/chrome/sidepanel-ui.ts` or `src/chrome/content.ts`. Use the `messagingFacade` for clean communication with the Service Worker.
7.  **Modal Implementation (if needed):** Create new modal components in `src/chrome/components/modals/` following the existing pattern.
8.  **Testing:** Write comprehensive Jest tests for all new or modified logic, particularly for Service Worker handlers, API clients, and core utility functions. Include test files in `__tests__` directories. Ensure adherence to the "Definition of Done" (Section 8) for testing coverage.

### 5.2. Debugging & Troubleshooting

When asked to debug an issue, prioritize these areas:

  * **Message Flow (`src/features/messaging/`):** The most common issues arise from incorrect message types, missing handlers, or malformed message payloads. Investigate:
      * `src/features/messaging/router.ts` - Message routing logic
      * `src/features/messaging/handlers/` - Specific handler implementations
      * `src/features/messaging/typed-registry.ts` - Handler registration
  * **Receipt Operations:** Check `src/features/messaging/handlers/expense/receipt-operations.handler.ts` for receipt-related issues.
  * **Modal Issues:** Debug modal problems via `src/chrome/components/modals/modal-manager.ts`.
  * **Expense UI State:** Investigate state issues in `src/chrome/domains/expenses/state/expense-store.ts`.
  * **Manifest Permissions (`manifest.json`):** Incorrect or missing Chrome API permissions can lead to silent failures. Always cross-reference the required API calls with declared permissions.
  * **Chrome Storage (`chrome.storage.local`):** Guide the user on how to inspect the extension's local storage via Chrome's DevTools. Production logs are also persisted here via `src/shared/logger/`.
  * **Service Worker Console:** Remind the user that Service Worker console logs appear in their *own dedicated DevTools window*, separate from the main browser window.
  * **Authentication/Token Issues:** If API calls are failing, investigate the token capture logic in `service-worker.ts` and the authentication state management in `features/auth/manager.ts`.
  * **API Configuration:** Check `src/features/expenses/config/api-config.ts` for endpoint configuration issues.
  * **Retry Logic:** Review `src/features/expenses/http/retry-policy.ts` for transient failure handling.
  * **Error Logging:** Check the `src/shared/logger/` service for specific error messages or traces, especially in production environments where errors might be stored in Chrome storage.

### 5.3. Refactoring Requests

When asked to refactor code:

  * Prioritize **type safety** (leveraging TypeScript's capabilities) and **readability**.
  * Improve **modularity** by breaking down large functions or files and adhere to **SOLID principles** where applicable.
  * Maintain or improve **test coverage**; all existing tests must pass after refactoring.
  * Ensure refactored code aligns with the **Key Architectural Patterns** (Section 3.2), especially regarding the message passing system and service container pattern.
  * Follow existing patterns: Factory pattern for object creation, Repository pattern for data persistence, Handler pattern for message processing.
  * Focus on consistency with existing code style and naming conventions.

### 5.4. Understanding Backend Integration

  * This codebase represents the **client-side Chrome extension only.** It interacts with, but does not include, the backend services.
  * API endpoints are defined within `src/features/[feature-name]/http/` for interaction with the Navan platform backend.
  * Response normalization happens in `response-normalizer.ts` to ensure consistent data handling.
  * **Do not attempt to generate backend code or database schemas** unless explicitly asked to switch context to a separate backend project. Assume the documented API endpoints are functional and available.

### 5.5. Common Workflows

#### Expense Duplication Workflow
  * Implemented in `src/chrome/components/workflows/expense-duplication-workflow.ts`
  * Flow: Select expense → Modify fields → Create new expense → Update UI

#### Receipt Upload Flow
  * Flow: Modal trigger → File selection → Upload handler → Service processing → API call → Storage update
  * Key files:
      * `src/chrome/components/modals/receipt-upload-modal.ts`
      * `src/features/messaging/handlers/expense/receipt-operations.handler.ts`

#### Template Scheduling Flow
  * Flow: Template creation → Schedule configuration → Chrome alarm setup → Background execution
  * Key files:
      * `src/features/templates/scheduling-engine.ts`
      * `src/features/templates/scheduler.ts`

-----

## 6. Backlog Management Guidelines (Using `backlog` CLI Tool)

This project utilizes a dedicated CLI tool, `backlog`, for managing tasks, documentation, and decisions. When prompted to "create a task," "list tasks," or interact with the project backlog, you **MUST** follow these specific instructions and use the `backlog` CLI commands.

### 6.1. Source of Truth

  * **Tasks:** Live under **`backlog/tasks/`** (drafts under **`backlog/drafts/`**). These Markdown files are the definitive source for current work.
  * **Project Documentation:** Resides in **`backlog/docs/`**.
  * **Project Decisions:** Documented in **`backlog/decisions/`**.
  * **Implementation Decisions:** Every implementation decision starts with reading the corresponding Markdown task file.

### 6.2. Defining Tasks

When defining `## Acceptance Criteria` (AC) for a task, focus on **outcomes, behaviors, and verifiable requirements** rather than step-by-step implementation details. ACs define *what* conditions must be met for the task to be considered complete. They must be testable and confirm that the core purpose of the task is achieved.

**Key Principles for Good Acceptance Criteria:**

  * **Outcome-Oriented:** Focus on the result, not the method.

  * **Testable/Verifiable:** Each criterion should be something that can be objectively tested or verified.

  * **Clear and Concise:** Unambiguous language.

  * **Complete:** Collectively, ACs should cover the scope of the task.

  * **User-Focused (where applicable):** Frame ACs from the perspective of the end-user or the system's external behavior.

    *Good Example:* `- [ ] User can successfully log in with valid credentials.`
    *Good Example:* `- [ ] System processes 1000 requests per second without errors.`
    *Bad Example (Implementation Step):* ` - [ ] Add a new function  handleLogin() in auth.ts.`

### 6.3. Task File Structure (`backlog/tasks/task-<id> - <title>.md`)

Once a task is created, it will be stored in the `backlog/tasks/` directory as a Markdown file with the format `task-<id> - <title>.md`.

**Recommended Task Anatomy:**

```markdown
# task‑XX - [Your Task Title]

## Description (the why)

Short, imperative explanation of the goal of the task and why it is needed. Do not add implementation details here; focus on the purpose and context.

## Acceptance Criteria (the what)

- [ ] [Criterion 1: Focus on verifiable outcomes]
- [ ] [Criterion 2: Be specific and testable]
- [ ] [Criterion 3: Cover the full scope of the task]

## Implementation Plan (the how) (added **after** starting work on a task)

1. [Step 1: Outline high-level implementation steps]
2. [Step 2: Break down complex logic if needed]
3. [Step 3: Consider testing strategy and relevant tests]
4. [Step 4: Think about documentation updates in `backlog/docs/` or `backlog/decisions/`]
5. [Step 5: Any specific technical considerations or dependencies]

## Implementation Notes (only added **after** finishing work on a task)

- Approach taken (e.g., "Used X pattern for Y feature, influenced by decision Z")
- Features implemented or modified (e.g., "Added new endpoint for Z, modified existing A component to support B")
- Technical decisions and trade-offs (e.g., "Decided to use X over Y due to Z performance implication and maintenance overhead")
- Modified or added files (e.g., `src/features/new-feature/index.ts`, `src/shared/types/new-message.ts`, `backlog/docs/updated_api.md`)
```

### 6.4. Additional Task Requirements

  * **Atomic and Testable:** Tasks must be **atomic** and **testable**. If a task is too large, break it down into smaller subtasks. Each task should represent a single unit of work that can be completed in a single pull request.
  * **No Future References:** **Never** reference tasks that are to be done in the future or that are not yet created. You can only reference previous tasks (id < current task id).
  * **Independence:** When creating multiple tasks, ensure they are **independent** and do not depend on future tasks.
      * *Example of **wrong** tasks splitting:* `task 1: "Add API endpoint for user data"`, `task 2: "Define the user model and DB schema"`. (Task 1 depends on future work in Task 2).
      * *Example of **correct** tasks splitting:* `task 1: "Add system for handling API requests"`, `task 2: "Add user model and DB schema"`, `task 3: "Add API endpoint for user data"`. (Tasks are ordered and independent units of work).

### 6.5. Implementing Tasks Workflow

Mandatory sections for every task:

  * **Implementation Plan**: (The **"how"**) Outline the steps to achieve the task. Because the implementation details may change after the task is created, **the implementation plan must be added only after putting the task in progress** and before starting working on the task.
  * **Implementation Notes**: Document your approach, decisions, challenges, and any deviations from the plan. This section is added after you are done working on the task. It should summarize what you did and why you did it. Keep it concise but informative, linking to modified files.

**IMPORTANT**: Do not implement anything else that deviates from the **Acceptance Criteria**. If you need to implement something that is not in the AC, update the AC first and then implement it, or create a new task for it.

### 6.6. Typical Backlog CLI Workflow

This sequence of commands represents a standard workflow for managing tasks:

```bash
# 1. Identify work: List tasks currently in the "To Do" status.
backlog task list -s "To Do" --plain

# 2. Read details & documentation: View a specific task's details and consult related documentation/decisions.
backlog task 42 --plain
# Read also all documentation files in `backlog/docs/` directory.
# Read also all decision files in `backlog/decisions/` directory.

# 3. Start work: Assign yourself to the task and move its status to "In Progress".
backlog task edit 42 -a @{yourself} -s "In Progress"

# 4. Add implementation plan: Outline the "how" before starting coding.
backlog task edit 42 --plan "1. Analyze current implementation\n2. Identify bottlenecks\n3. Refactor in phases"

# 5. Break work down (if needed): Create subtasks or additional tasks for complex work.
backlog task create "Refactor DB layer" -p 42 -a @{yourself} -d "Description" --ac "Tests pass,Performance improved"

# 6. Complete and mark Done: Update task status and add implementation notes.
backlog task edit 42 -s Done --notes "Implemented GraphQL resolver with error handling and performance monitoring"
```

### 6.7. Definition of Done (DoD)

A task is **Done** only when **ALL** of the following criteria are met:

1.  **Acceptance Criteria** checklist in the task file is fully checked (all `- [ ]` changed to `- [x]`).
2.  **Implementation plan** was followed or deviations were clearly documented in the `## Implementation Notes` section.
3.  **Automated tests** (unit + integration) cover all new and modified logic, demonstrating functionality and preventing regressions. Tests should be placed in appropriate `__tests__` directories.
4.  **Static analysis**: All linter (`npm run lint:fix`) and formatter (`npm run format:fix`) checks succeed.
5.  **Documentation**:
      * All relevant documentation is updated (any relevant `README` file, `backlog/docs/`, `backlog/decisions/`, etc.).
      * The task file **MUST** have an `## Implementation Notes` section added, concisely summarizing:
          * Approach taken
          * Features implemented or modified
          * Technical decisions and trade-offs
          * Modified or added files
6.  **Review**: Code has been self-reviewed thoroughly.
7.  **Task Hygiene**: Status is correctly set to **Done** via CLI (`backlog task edit <id> -s Done`).
8.  **No Regressions**: Performance, security, and license checks are green and show no adverse impact.

⚠️ **IMPORTANT**: Never mark a task as Done without completing ALL items above.

### 6.8. Handy CLI Commands for Backlog Management Reference

| Purpose            | Command                                                      |
| :----------------- | :----------------------------------------------------------- |
| Create task        | `backlog task create "Add OAuth"`                            |
| Create with desc   | `backlog task create "Feature" -d "Enables users to use this feature"` |
| Create with AC     | `backlog task create "Feature" --ac "Must work,Must be tested"` |
| Create with deps   | `backlog task create "Feature" --dep task-1,task-2`          |
| Create sub task    | `backlog task create -p 14 "Add Google auth"`                |
| List tasks         | `backlog task list --plain`                                  |
| View detail        | `backlog task 7 --plain`                                     |
| Edit task          | `backlog task edit 7 -a @{yourself} -l auth,backend`         |
| Add plan           | `backlog task edit 7 --plan "Implementation approach"`       |
| Add AC             | `backlog task edit 7 --ac "New criterion,Another one"`       |
| Add deps           | `backlog task edit 7 --dep task-1,task-2`                    |
| Add notes          | `backlog task edit 7 --notes "We added this and that feature because"` |
| Mark as done       | `backlog task edit 7 -s "Done"`                              |
| Archive task       | `backlog task archive 7`                                     |
| Draft flow         | `backlog draft create "Spike GraphQL"` → `backlog draft promote 3.1` |
| Demote to draft    | `backlog task demote <task-id>`                              |

-----

## 7. Tips for AI Agents (Specifically for Claude Code)

  * **Prioritize `CLAUDE.md` Context:** Always refer back to this `CLAUDE.md` file as your primary source of truth for project structure, guidelines, and commands.
  * **Use `--plain` for CLI:** When interacting with the `backlog` CLI tool (e.g., listing or viewing tasks), **always use the `--plain` flag** to ensure AI-friendly text output instead of interactive UI.
  * **`backlog` CLI for Task Management:** When the user mentions "create a task," they specifically mean to create a task using the `backlog task create` CLI tool, following the detailed guidelines in Section 6.
  * **Focus on Outcomes (ACs):** When generating or evaluating task acceptance criteria, strictly adhere to the principles outlined in Section 6.2 (Outcome-Oriented, Testable/Verifiable, Clear, Concise, Complete, User-Focused).
  * **Adhere to DoD:** Understand and follow the "Definition of Done" (Section 6.7) when concluding work on a task.
  * **Respect Architecture & Patterns:** When proposing code changes, ensure they align with the `Key Architectural Patterns` (Section 3.2) and `Important Implementation Details` (Section 3.3). Particularly:
      * Use singleton pattern via ServiceContainer
      * Follow the message-based architecture
      * Implement proper handlers in the correct directory structure
      * Use the messaging facade for UI communication
  * **Type Safety:** Favor TypeScript for all new or modified code to maintain type safety and code quality. Leverage the comprehensive type system already in place.
  * **Testing:** Always write tests in `__tests__` directories following the existing pattern. Tests are mandatory for handlers, services, and components.
  * **Modal System:** When implementing user interactions, consider if a modal is appropriate and follow the existing modal patterns.
  * **No Unsanctioned External Dependencies:** Avoid suggesting or adding new major external libraries or frameworks without explicit user approval or if they contradict the existing technology stack.
  * **Validate Permissions:** When dealing with Chrome API features, always consider if the `manifest.json` needs permission updates.
  * **Service Container:** Always use the service container for dependency injection rather than direct imports when working with handlers.
  * **Package Info:** Check `package-info.ts` files for module-specific documentation and version information.