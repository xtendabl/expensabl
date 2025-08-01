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
