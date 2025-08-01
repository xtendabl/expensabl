# Introduction

Welcome to the Expensabl documentation! Expensabl is an expense management automation tool living right in your browser.

## What is Expensabl?

Expensabl is a Chrome extension designed to automate expense management on the Navan platform. It streamlines the expense creation process by eliminating manual data entry and providing intelligent automation features.

### Core Capabilities

- **Automatic Token Capture**: Seamlessly captures authentication tokens when you log into Navan
- **Smart Templates**: Create reusable templates for recurring expenses with variable substitution
- **Scheduled Automation**: Set up recurring expenses that create themselves automatically
- **Persistent Side Panel**: Always-available interface that stays open across browser tabs
- **Enterprise-Ready**: Built with security, reliability, and performance in mind

## Architecture Overview

Expensabl follows a layered architecture with clear separation of concerns:

### Chrome Extension Layer
- **Service Worker**: Handles background tasks, message routing, and token capture
- **Content Script**: Injected into Navan pages for seamless token interception
- **Side Panel UI**: Persistent interface for expense management
- **Message Adapter**: Type-safe communication between extension contexts

### Features Layer
- **Authentication**: Secure token management with validation and refresh
- **Expenses**: Complete expense lifecycle management with retry logic
- **Messaging**: Robust message routing with handler pattern
- **Templates**: Sophisticated template engine with scheduling capabilities

### Shared Services
- **Logger**: Environment-aware logging with Chrome storage integration
- **Storage**: Abstracted Chrome storage with transaction support
- **Types**: Shared TypeScript interfaces ensuring type safety

## Key Benefits

### For End Users
- **Time Savings**: Reduce expense creation time by up to 90% with templates
- **Never Forget**: Scheduled expenses ensure recurring costs are always captured
- **Consistency**: Templates ensure expenses follow company policies
- **Convenience**: Side panel stays open while you work

### For Organizations
- **Compliance**: Consistent expense data following company policies
- **Visibility**: All expenses captured on time for better financial tracking
- **Efficiency**: Reduced administrative overhead for expense management
- **Integration**: Seamless integration with existing Navan workflows

## Documentation Structure

This documentation is organized to serve different audiences:

### User Guide
Step-by-step instructions for using Expensabl:
- Installation and setup
- Creating and managing expenses
- Working with templates
- Setting up schedules

### Developer Guide
Technical documentation for contributors:
- Architecture deep dive
- Development environment setup
- Building and testing
- Contributing guidelines

### API Reference
Detailed API documentation:
- Message API for extension communication
- Storage API for data persistence
- Expense API for Navan integration

## Getting Started

### For Users
1. Install the extension from the Chrome Web Store
2. Navigate to Navan and sign in
3. Open the Expensabl side panel
4. Start creating expenses with templates!

### For Developers
1. Clone the repository
2. Install dependencies with `npm install`
3. Build with `npm run build:dev`
4. Load unpacked extension in Chrome

For detailed instructions, see the [Getting Started](./user-guide/getting-started.md) guide.