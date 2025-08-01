/**
 * Core Business Logic Features
 * @packageDocumentation
 * @module features
 *
 * This package contains the core business logic organized by domain:
 *
 * ## Feature Modules
 *
 * ### auth/
 * Authentication token management and validation
 * - Captures and validates authentication tokens
 * - Manages token lifecycle and storage
 * - Provides token validation strategies
 *
 * ### expenses/
 * Expense management and Navan API integration
 * - CRUD operations for expenses
 * - HTTP client with retry logic
 * - Response normalization and error handling
 * - Three-step expense creation process
 *
 * ### messaging/
 * Inter-component communication infrastructure
 * - Type-safe message routing
 * - Handler registration and dispatch
 * - Request/response transformation
 * - Error propagation and logging
 *
 * ### templates/
 * Expense template creation and scheduling
 * - Template CRUD operations
 * - Chrome alarms-based scheduling engine
 * - Schedule calculation strategies (daily, weekly, monthly, custom)
 * - Template execution and expense creation
 *
 * ## Design Principles
 * - Domain-driven design with clear boundaries
 * - Dependency injection for testability
 * - Strategy pattern for extensibility
 * - Type-safe message passing
 */
export {};
