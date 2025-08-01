# Getting Started

This guide will help you get up and running with Expensabl quickly.

## Prerequisites

### For Users
- Google Chrome browser (version 119 or later)
- A Navan account with expense creation permissions

### For Developers
- Node.js (v16 or higher)
- npm (v7 or higher)
- Git

## Installation Options

### Option 1: Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Expensabl"
3. Click "Add to Chrome"
4. Grant the required permissions

### Option 2: Development Build

#### Clone and Install
```bash
# Clone the repository
git clone https://github.com/xtendabl/expensabl.git
cd expensabl

# Install dependencies
npm install

# Build for development (includes source maps)
npm run build:dev

# Or build for production (optimized)
npm run build
```

#### Load in Chrome
1. **Open Chrome Extension Management**
   - Navigate to `chrome://extensions/` in your Chrome browser
   - Or click the puzzle icon in the toolbar → "Manage Extensions"

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to your `expensabl/dist` directory
   - Select the folder and click "Open"

4. **Verify Installation**
   - The extension should appear in your extensions list
   - Look for the Expensabl icon in your Chrome toolbar
   - If not visible, click the puzzle icon and pin Expensabl

## First Time Setup

### 1. Sign in to Navan
- Navigate to [app.navan.com](https://app.navan.com)
- Sign in with your corporate credentials
- The extension will automatically capture your authentication token
- You'll see a notification when the token is captured successfully

### 2. Open the Side Panel
There are several ways to access Expensabl:

**Method 1: Extension Icon**
- Click the Expensabl icon in the Chrome toolbar
- The side panel will open automatically

**Method 2: Extensions Menu**
- Click the Extensions puzzle icon
- Find Expensabl in the list
- Click "Open side panel"

**Method 3: Chrome Menu**
- Click the three-dot menu in Chrome
- Go to "More tools" → "Extensions"
- Find Expensabl and click "Open side panel"

### 3. Initial Configuration
When you first open Expensabl:

1. **Help Section**: Review the built-in help guide
2. **Permissions**: Grant any additional permissions if prompted
3. **Preferences**: Set your default expense preferences

## Creating Your First Expense

### Manual Creation
1. In the side panel, click "Fetch Expenses" to load your recent expenses
2. Click "Create New Expense" button
3. Fill in the required fields:
   - Merchant name
   - Amount and currency
   - Date
   - Category/Policy
   - Description (optional)
4. Click "Submit Expense"

### From a Template
1. Navigate to the Templates section
2. Click "Apply" on any template
3. Review and modify the pre-filled data
4. Submit the expense

## Development Workflow

If you're developing or customizing Expensabl:

### Making Changes
1. **Edit Source Files**: Make changes in the `src/` directory
2. **Rebuild**: Run `npm run build:dev` to rebuild with your changes
3. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Find Expensabl and click the refresh icon
   - Or use `Cmd+R` (Mac) / `Ctrl+R` (Windows/Linux) on the extensions page
4. **Test Changes**: Open the extension and verify your changes

### Available Commands
```bash
# Development build with source maps
npm run build:dev

# Production build (optimized)
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Fix linting issues
npm run lint:fix

# Fix all formatting
npm run format:fix

# Clean build artifacts
npm run clean
```

### Debugging Tips

**Background Service Worker**:
- Click "Inspect views: service worker" on the extension card in `chrome://extensions/`
- This opens DevTools for background script debugging

**Side Panel UI**:
- Right-click the extension side panel and select "Inspect"
- This opens DevTools for UI debugging

**Content Scripts**:
- Open DevTools on any Navan page
- Content script logs appear in the page's console

## Troubleshooting

### Extension Not Loading
- Ensure you're in Developer Mode
- Check that the `dist/` folder exists and contains `manifest.json`
- Try rebuilding with `npm run build:dev`

### Token Not Captured
- Make sure you're signed into Navan
- Refresh the Navan page after installing the extension
- Check the service worker console for errors

### Side Panel Not Opening
- Ensure Chrome version is 119 or later
- Try unpinning and re-pinning the extension
- Restart Chrome if necessary

## Next Steps

Now that you have Expensabl running:

- Learn about [creating templates](./templates.md) for recurring expenses
- Set up [scheduled expenses](./scheduling.md) for automation
- Understand [authentication](./authentication.md) and token management
- Explore [advanced configuration](./configuration.md) options

For developers:
- Review the [Architecture Overview](../developer-guide/architecture.md)
- Understand the [Project Structure](../developer-guide/project-structure.md)
- Follow the [Contributing Guidelines](../developer-guide/contributing.md)