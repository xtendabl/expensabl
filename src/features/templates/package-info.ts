/**
 * Template Management and Scheduling Domain
 * @packageDocumentation
 * @module features/templates
 *
 * Manages expense templates and their automated scheduling.
 *
 * ## Core Components
 *
 * ### Template Management
 * - **manager.ts** - Template CRUD operations and lifecycle
 * - **repository.ts** - Storage layer for templates
 * - **validator.ts** - Template and scheduling validation
 * - **factories/** - Factory pattern for template creation
 *
 * ### Scheduling System
 * - **scheduling-engine.ts** - Chrome alarms integration for execution
 * - **scheduler.ts** - Schedule calculation with strategy pattern
 * - **constants/** - Scheduling intervals and limits
 *
 * ## Scheduling Strategies
 * - **Daily**: Executes at specified time each day
 * - **Weekly**: Executes on selected days at specified time
 * - **Monthly**: Executes on specific day of month
 * - **Custom**: Fixed interval scheduling (minimum 5 minutes)
 *
 * ## Key Features
 * - **Duplicate execution prevention** - Tracks recent executions
 * - **Singleton enforcement** - Single alarm listener instance
 * - **Pause/Resume** - Temporary scheduling suspension
 * - **Execution history** - Success/failure tracking with expense IDs
 *
 * ## Chrome Alarms Integration
 * Uses Chrome's alarms API for reliable scheduling that survives:
 * - Browser restarts
 * - Extension updates
 * - Service worker lifecycle
 */
export {};
