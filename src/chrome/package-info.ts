/**
 * Chrome Extension UI Components and Service Worker
 * @packageDocumentation
 * @module chrome
 *
 * This package contains Chrome extension-specific components:
 *
 * ## Main Components
 * - **service-worker.ts** - Background service worker handling message routing and alarms
 * - **sidepanel-ui.ts** - Main UI controller for the extension's side panel
 * - **message-adapter.ts** - Transforms messages between UI and background contexts
 *
 * ## Subdirectories
 * - **components/** - Reusable UI components (templates, expenses)
 * - **domains/** - Domain-specific UI logic organized by feature
 * - **shared/** - Shared UI services and components
 * - **builders/** - Builder pattern implementations for complex UI structures
 * - **constants/** - UI constants and configuration
 *
 * ## Key Responsibilities
 * - Manages Chrome extension lifecycle and permissions
 * - Handles UI rendering and user interactions
 * - Routes messages between content scripts, UI, and background
 * - Integrates with Chrome APIs (storage, alarms, notifications)
 */
export {};
