import { chromeLogger as logger } from '../../../shared/services/logger/chrome-logger-setup';

export interface ExpenseField {
  id: string;
  label: string;
  path: string; // Path to the field in the expense object
  formatter?: (value: any, expense?: any) => string;
  available: boolean;
}

export interface FieldConfiguration {
  selectedFields: string[]; // Array of field IDs in display order
  maxFields: number;
}

export class FieldConfigurationService {
  private static readonly STORAGE_KEY = 'expenseFieldConfiguration';
  private static readonly MAX_FIELDS = 8;

  // Define all available fields that can be displayed
  private static readonly AVAILABLE_FIELDS: ExpenseField[] = [
    {
      id: 'merchant',
      label: 'Merchant',
      path: 'merchant.name',
      formatter: (value: any, expense: any) => {
        // Try different paths for merchant name
        return value || expense?.merchant?.name || expense?.merchantName || 'Unknown Merchant';
      },
      available: true,
    },
    {
      id: 'amount',
      label: 'Amount',
      path: 'merchantAmount',
      formatter: (value: number, expense: any) => {
        const currency = expense?.merchantCurrency || 'USD';
        return `${currency} ${value?.toFixed(2) || '0.00'}`;
      },
      available: true,
    },
    {
      id: 'date',
      label: 'Transaction Date',
      path: 'expenseDate',
      formatter: (value: string, expense: any) => {
        // Try different date fields
        const dateValue = value || expense?.date || expense?.transactionDate;
        if (!dateValue) return 'N/A';
        return new Date(dateValue).toLocaleDateString();
      },
      available: true,
    },
    {
      id: 'dateSubmitted',
      label: 'Created Date',
      path: 'expenseProperties.dateSubmitted',
      formatter: (value: string) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
      },
      available: true,
    },
    {
      id: 'category',
      label: 'Category',
      path: 'merchant.category',
      formatter: (value: string, expense: any) => {
        // Try different paths for category
        return value || expense?.merchant?.category || expense?.category || 'Uncategorized';
      },
      available: true,
    },
    {
      id: 'policy',
      label: 'Policy',
      path: 'policyName',
      formatter: (value: string) => value || 'No policy',
      available: true,
    },
    {
      id: 'status',
      label: 'Status',
      path: 'status',
      available: true,
    },
    {
      id: 'expenseType',
      label: 'Expense Type',
      path: 'expenseType',
      formatter: (value: string) => value || 'Manual',
      available: true,
    },
    {
      id: 'description',
      label: 'Description',
      path: 'details.description',
      formatter: (value: string) => value || 'No description',
      available: true,
    },
    {
      id: 'paymentMethod',
      label: 'Payment Method',
      path: 'paymentMethod',
      formatter: (value: string) => value || 'Unknown',
      available: true,
    },
    {
      id: 'reimbursable',
      label: 'Reimbursable',
      path: 'reimbursable',
      formatter: (value: boolean) => (value ? 'Yes' : 'No'),
      available: true,
    },
    {
      id: 'report',
      label: 'Report',
      path: 'reportName',
      formatter: (value: string) => value || 'Not in report',
      available: true,
    },
    {
      id: 'project',
      label: 'Project',
      path: 'projectName',
      formatter: (value: string) => value || 'No project',
      available: true,
    },
    {
      id: 'taxAmount',
      label: 'Tax Amount',
      path: 'taxAmount',
      formatter: (value: number, expense: any) => {
        if (!value) return 'N/A';
        const currency = expense?.merchantCurrency || 'USD';
        return `${currency} ${value.toFixed(2)}`;
      },
      available: true,
    },
    {
      id: 'tripName',
      label: 'Trip',
      path: 'tripName',
      formatter: (value: string) => value || 'No trip',
      available: true,
    },
    {
      id: 'billable',
      label: 'Billable',
      path: 'billable',
      formatter: (value: boolean) => (value ? 'Yes' : 'No'),
      available: true,
    },
    {
      id: 'tags',
      label: 'Tags',
      path: 'tags',
      formatter: (value: string[]) => {
        if (!value || value.length === 0) return 'No tags';
        return value.join(', ');
      },
      available: true,
    },
    {
      id: 'attendees',
      label: 'Attendees',
      path: 'attendees',
      formatter: (value: any[]) => {
        if (!value || value.length === 0) return 'No attendees';
        return `${value.length} attendee${value.length > 1 ? 's' : ''}`;
      },
      available: true,
    },
    {
      id: 'location',
      label: 'Location',
      path: 'location',
      formatter: (value: string) => value || 'No location',
      available: true,
    },
  ];

  // Default fields for first-time users
  private static readonly DEFAULT_FIELDS = [
    'merchant',
    'amount',
    'date',
    'category',
    'status',
    'policy',
    'dateSubmitted',
    'description',
  ];

  /**
   * Get all available fields
   */
  static getAvailableFields(): ExpenseField[] {
    return [...this.AVAILABLE_FIELDS];
  }

  /**
   * Load field configuration from storage
   */
  static async loadConfiguration(): Promise<FieldConfiguration> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);

      if (result[this.STORAGE_KEY]) {
        logger.info('Loaded field configuration', result[this.STORAGE_KEY]);
        return result[this.STORAGE_KEY];
      }

      // Return default configuration
      logger.info('No saved configuration, using defaults');
      return {
        selectedFields: [...this.DEFAULT_FIELDS],
        maxFields: this.MAX_FIELDS,
      };
    } catch (error) {
      logger.error('Failed to load field configuration', error);
      return {
        selectedFields: [...this.DEFAULT_FIELDS],
        maxFields: this.MAX_FIELDS,
      };
    }
  }

  /**
   * Save field configuration to storage
   */
  static async saveConfiguration(config: FieldConfiguration): Promise<void> {
    try {
      // Validate configuration
      if (config.selectedFields.length > this.MAX_FIELDS) {
        throw new Error(`Cannot select more than ${this.MAX_FIELDS} fields`);
      }

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: config,
      });

      logger.info('Saved field configuration', config);
    } catch (error) {
      logger.error('Failed to save field configuration', error);
      throw error;
    }
  }

  /**
   * Get field value from expense object using path
   */
  static getFieldValue(expense: any, path: string): any {
    const parts = path.split('.');
    let value = expense;

    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }

    return value;
  }

  /**
   * Format field value for display
   */
  static formatFieldValue(field: ExpenseField, expense: any): string {
    const value = this.getFieldValue(expense, field.path);

    if (field.formatter) {
      return field.formatter(value, expense);
    }

    if (value == null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);

    return String(value);
  }

  /**
   * Get display fields based on configuration
   */
  static async getDisplayFields(
    expense: any
  ): Promise<Array<{ label: string; value: string; id: string }>> {
    const config = await this.loadConfiguration();
    const displayFields: Array<{ label: string; value: string; id: string }> = [];

    for (const fieldId of config.selectedFields) {
      const field = this.AVAILABLE_FIELDS.find((f) => f.id === fieldId);

      if (field && field.available) {
        displayFields.push({
          id: field.id,
          label: field.label,
          value: this.formatFieldValue(field, expense),
        });
      }
    }

    return displayFields;
  }
}
