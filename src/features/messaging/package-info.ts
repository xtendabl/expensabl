/**
 * Message Routing and Handler Infrastructure
 * @packageDocumentation
 * @module features/messaging
 *
 * Type-safe message passing between Chrome extension components.
 *
 * ## Architecture
 *
 * ### Core Components
 * - **router.ts** - Message routing with validation
 * - **transport.ts** - Chrome runtime message transport
 * - **service-container.ts** - Dependency injection container
 * - **types.ts** - Message interfaces and utilities
 *
 * ### Handler System
 * - **handlers/base-handler.ts** - Abstract handler with validation
 * - **handlers/typed-registry.ts** - Type-safe handler registration
 * - **handlers/expense/** - Expense-related message handlers
 * - **handlers/template/** - Template-related message handlers
 * - **handlers/token/** - Authentication token handlers
 *
 * ## Message Flow
 * 1. UI sends message via chrome.runtime.sendMessage
 * 2. Transport receives and forwards to Router
 * 3. Router validates message format
 * 4. Router finds registered handler by action type
 * 5. Handler validates payload and executes business logic
 * 6. Response flows back through the same path
 *
 * ## Type Safety
 * - Discriminated unions for message types
 * - Generic constraints on handlers
 * - Compile-time action-to-handler mapping
 *
 * ## Error Handling
 * - Validation at transport, router, and handler levels
 * - Structured error responses
 * - Comprehensive logging at each step
 */
export {};
