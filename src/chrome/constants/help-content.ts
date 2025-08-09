interface ParagraphElement {
  type: 'paragraph';
  text: string;
}

interface BulletListElement {
  type: 'bullets';
  items: string[];
}

interface TableElement {
  type: 'table';
  headers: string[];
  rows: string[][];
}

type ContentElement = ParagraphElement | BulletListElement | TableElement;

interface ContentSection {
  id?: string;
  heading: string;
  content: ContentElement[];
}

interface HelpContent {
  title: string;
  sections: ContentSection[];
}

export const HELP_CONTENT: HelpContent = {
  title: 'Help & Getting Started',
  sections: [
    {
      heading: 'Getting Started',
      content: [
        {
          type: 'paragraph',
          text: 'Expensabl automates expense management for Navan users with templates and scheduling.',
        },
        {
          type: 'paragraph',
          text: 'The extension automatically captures your Navan authentication tokens for seamless integration.',
        },
      ],
    },
    {
      heading: 'Search Expenses',
      content: [
        {
          type: 'paragraph',
          text: '**Search Bar Location:** Find the search functionality at the top of the expenses panel, right below the "Fetch Expenses" button.',
        },
        {
          type: 'paragraph',
          text: 'The search feature allows you to quickly find specific expenses by searching through multiple fields:',
        },
        {
          type: 'bullets',
          items: [
            '**Merchant Name:** Search by vendor or merchant (e.g., "Uber", "Starbucks")',
            '**Amount:** Find expenses by exact or partial amount (e.g., "25.50" or "25")',
            '**Description:** Search within expense descriptions and notes',
            '**Policy Type:** Filter by expense category (e.g., "Meals", "Transport", "Office Supplies")',
            '**Date:** Search by date in various formats (e.g., "March", "03/15", "2024")',
          ],
        },
        {
          type: 'paragraph',
          text: '**Search Tips:**',
        },
        {
          type: 'bullets',
          items: [
            'Search is case-insensitive for easier matching',
            'Partial matches work - type "Star" to find "Starbucks"',
            'Results update in real-time as you type',
            'Clear the search box to view all expenses again',
            'Combined searches work - search updates across all visible expenses',
          ],
        },
        {
          type: 'paragraph',
          text: '**Troubleshooting Search Issues:**',
        },
        {
          type: 'bullets',
          items: [
            'No results? Check spelling and try partial terms',
            'Ensure expenses are loaded first by clicking "Fetch Expenses"',
            'Date searches support multiple formats - try different ones',
            'If search seems stuck, clear the field and try again',
          ],
        },
      ],
    },
    {
      heading: 'Expense Detail View',
      content: [
        {
          type: 'paragraph',
          text: '**Accessing Details:** Click on any expense card in the list to expand and view complete information.',
        },
        {
          type: 'paragraph',
          text: 'The expense detail view provides comprehensive information about each expense:',
        },
        {
          type: 'table',
          headers: ['Field', 'Description', 'Actions Available'],
          rows: [
            ['Merchant', 'Vendor or service provider name', 'Copy to clipboard'],
            [
              'Amount',
              'Total expense amount with currency',
              'View in original currency if applicable',
            ],
            ['Date', 'Transaction or submission date', 'View formatted date'],
            ['Policy', 'Expense category and compliance', 'View policy details'],
            ['Status', 'Current approval status', 'Track approval progress'],
            ['Description', 'Detailed notes and purpose', 'Read full description'],
            ['Receipts', 'Attached receipt images/files', 'View, download, or delete receipts'],
            [
              'Custom Fields',
              'Additional configured fields',
              'View project codes, cost centers, etc.',
            ],
          ],
        },
        {
          type: 'paragraph',
          text: '**Available Actions in Detail View:**',
        },
        {
          type: 'bullets',
          items: [
            '**Duplicate:** Create a copy of the expense with ability to modify before saving',
            '**Save as Template:** Convert to reusable template for similar future expenses',
            '**Edit:** Modify expense details (if in draft status)',
            '**Delete:** Remove expense (requires confirmation)',
            '**View Receipts:** Open attached receipt images in modal',
            '**Add Receipt:** Upload new receipt to existing expense',
          ],
        },
        {
          type: 'paragraph',
          text: '**Visual Indicators:**',
        },
        {
          type: 'bullets',
          items: [
            '🟢 Green badge: Approved expenses',
            '🟡 Yellow badge: Pending approval',
            '🔵 Blue badge: Draft expenses',
            '🔴 Red badge: Rejected or requires action',
            '📎 Paperclip icon: Has attached receipts',
            '⚠️ Warning icon: Missing required information',
          ],
        },
      ],
    },
    {
      heading: 'Duplicate Expense Workflow',
      content: [
        {
          type: 'paragraph',
          text: '**Starting Point:** Click the "Duplicate" button on any expense card or in the detail view.',
        },
        {
          type: 'paragraph',
          text: '**Step-by-Step Duplication Process:**',
        },
        {
          type: 'bullets',
          items: [
            '**Step 1:** Select source expense and click "Duplicate" button',
            '**Step 2:** Duplication form opens with all fields pre-filled from original',
            '**Step 3:** Modify any fields as needed:',
            '  • Change date (defaults to today)',
            '  • Update amount if different',
            '  • Modify description or add notes',
            '  • Select different policy type if applicable',
            '  • Add or remove custom field values',
            '**Step 4:** Handle receipts:',
            '  • Option to copy receipts from original',
            '  • Upload new receipts via drag-and-drop or file selection',
            '  • Remove unwanted receipts before saving',
            '**Step 5:** Choose submission method:',
            '  • "Submit" to send for approval immediately',
            '  • "Save as Draft" to complete later',
          ],
        },
        {
          type: 'paragraph',
          text: '**Receipt Upload During Duplication:**',
        },
        {
          type: 'table',
          headers: ['Upload Method', 'Instructions', 'File Limits'],
          rows: [
            ['Drag & Drop', 'Drag files directly onto the upload zone', 'Max 10MB per file'],
            ['File Browser', 'Click "Choose Files" to browse', 'Multiple files supported'],
            [
              'Copy from Original',
              'Check "Include receipts" option',
              'Copies all original receipts',
            ],
            ['Camera Upload', 'Use device camera (mobile)', 'JPEG/PNG formats'],
          ],
        },
        {
          type: 'paragraph',
          text: '**Supported Receipt Formats:** PDF, PNG, JPG, JPEG, GIF, HEIC (max 10MB each)',
        },
        {
          type: 'paragraph',
          text: '**Troubleshooting Duplication Issues:**',
        },
        {
          type: 'bullets',
          items: [
            'Duplication fails? Check authentication status and re-login if needed',
            'Receipt upload stuck? Verify file size is under 10MB',
            'Fields not copying? Some fields may be restricted by policy',
            "Can't submit? Ensure all required fields are filled",
          ],
        },
      ],
    },
    {
      heading: 'Submit vs Save as Draft',
      content: [
        {
          type: 'paragraph',
          text: '**Understanding the Difference:** Choose the right action based on your expense readiness.',
        },
        {
          type: 'table',
          headers: ['Action', 'When to Use', 'What Happens', 'Can Edit After?'],
          rows: [
            [
              '**Submit**',
              'Expense is complete with all receipts',
              'Sent for manager approval immediately',
              'No - becomes read-only',
            ],
            [
              '**Save as Draft**',
              'Need to add receipts or info later',
              'Saved locally, not sent for approval',
              'Yes - can edit anytime',
            ],
          ],
        },
        {
          type: 'paragraph',
          text: '**Submit Workflow:**',
        },
        {
          type: 'bullets',
          items: [
            '1. Fill in all required fields (marked with asterisk *)',
            '2. Attach necessary receipts (if required by policy)',
            '3. Review expense details for accuracy',
            '4. Click "Submit" button',
            '5. Confirm submission in dialog',
            '6. Expense enters approval workflow',
            '7. Track status in expense list (changes to "Pending")',
          ],
        },
        {
          type: 'paragraph',
          text: '**Save as Draft Workflow:**',
        },
        {
          type: 'bullets',
          items: [
            '1. Fill in available information',
            '2. Click "Save as Draft" button',
            '3. Expense saved with "Draft" status',
            '4. Find draft expenses with blue "Draft" badge',
            '5. Click to open and continue editing',
            '6. Add missing receipts or information',
            '7. Submit when ready or continue saving as draft',
          ],
        },
        {
          type: 'paragraph',
          text: '**Important Considerations:**',
        },
        {
          type: 'bullets',
          items: [
            '⚠️ **Submitted expenses cannot be edited** - ensure accuracy before submitting',
            '📝 **Drafts are stored locally** - not visible to managers until submitted',
            '🔄 **Drafts sync across devices** - continue editing on any device',
            '⏰ **No time limit on drafts** - complete at your convenience',
            '✅ **Validation on submit** - system checks for required fields',
          ],
        },
        {
          type: 'paragraph',
          text: '**Best Practices:**',
        },
        {
          type: 'bullets',
          items: [
            'Use drafts for expenses missing receipts',
            'Submit immediately for urgent reimbursements',
            'Review company policy for receipt requirements',
            'Set reminders to complete draft expenses',
            'Batch submit multiple complete expenses',
          ],
        },
      ],
    },
    {
      heading: 'Managing Expenses',
      content: [
        {
          type: 'bullets',
          items: [
            'Click "Fetch Expenses" to load your recent expenses from Navan with real-time status',
            'Click any expense to view detailed information including merchant, amount, policy, and approval status',
            'Use "Duplicate Expense" to quickly create similar expenses with updated dates',
            'Click "Save as Template" to convert expenses into reusable templates',
          ],
        },
      ],
    },
    {
      heading: 'Template System',
      content: [
        {
          type: 'bullets',
          items: [
            'Create up to 5 expense templates with custom names and details',
            'Template cards show merchant, amount, usage statistics, and scheduling status',
            'Edit templates in-place with validation for all fields',
            'Apply templates to create new expenses with current date automatically',
            'Duplicate existing templates or delete with confirmation dialogs',
          ],
        },
      ],
    },
    {
      heading: 'Automated Scheduling',
      content: [
        {
          type: 'paragraph',
          text: 'Schedule templates for automatic expense creation at specified times:',
        },
        {
          type: 'table',
          headers: ['Interval Type', 'Options', 'Example'],
          rows: [
            ['Daily', 'Every day at specified time', '9:00 AM daily'],
            ['Weekly', 'Selected days of the week', 'Every Mon, Wed, Fri at 2:00 PM'],
            ['Monthly', 'Specific day or last day', '15th of each month at 10:00 AM'],
            ['Custom', '5 minutes to 24 hours', 'Every 30 minutes'],
          ],
        },
        {
          type: 'bullets',
          items: [
            'Pause/resume schedules without losing configuration',
            'View execution history showing last 50 runs with success/failure status',
          ],
        },
      ],
    },
    {
      heading: 'Notifications & Monitoring',
      content: [
        {
          type: 'bullets',
          items: [
            'Receive Chrome notifications for scheduled expense creation results',
            'Success notifications include "View Expense" action buttons',
            'Authentication alerts provide "Open Navan" action for re-authentication',
            'Smart retry system automatically handles transient failures with exponential backoff',
          ],
        },
      ],
    },
    {
      heading: 'Data & Security',
      content: [
        {
          type: 'paragraph',
          text: 'Your data is stored securely with the following capacities:',
        },
        {
          type: 'table',
          headers: ['Storage Type', 'Capacity', 'Used For'],
          rows: [
            ['Local Storage', '10 MB', 'Templates, expenses, execution logs'],
            ['Sync Storage', '100 KB', 'Preferences and settings'],
            ['Session Storage', '10 MB', 'Temporary authentication data'],
          ],
        },
        {
          type: 'bullets',
          items: [
            'Template metadata syncs across your devices via Chrome sync',
            'Authentication tokens cached for 5 minutes to reduce API calls',
            'Comprehensive logging system for debugging and monitoring',
          ],
        },
      ],
    },
  ],
};
