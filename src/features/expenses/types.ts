// Export search transaction types
export * from './types/search-transaction.types';

// Define missing interfaces for the expense system
export interface ExpenseFilters extends Record<string, unknown> {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: string;
  merchant?: string;
  // Navan API specific search parameters
  q?: string; // Query string for merchant name search
  'authorizationInstant.from'?: string; // ISO 8601 date format
  'authorizationInstant.to'?: string; // ISO 8601 date format
}

export interface ExpenseListResponse {
  data: NavanExpenseData[];
}

export interface ExpenseCreatePayload {
  merchantAmount: number;
  merchantCurrency: string;
  date: string;
  merchant: { name: string };
  policyType?: string;
  details?: {
    category?: string;
    description?: string;
  };
  reportingData?: {
    department?: string;
    project?: string;
  };
  isDraft?: boolean; // When true, expense is created but not submitted
}

// Alias for the main expense type
export type NavanExpenseData = Expense;
export type ExpenseData = Expense;

export type User = {
  /** ISO 8601 date string indicating when the user was created */
  dateCreated: string;
  /** ISO 8601 date string indicating when the user was last modified */
  dateModified: string;
  /** Unique identifier for the user */
  uuid: string;
  /** Unique identifier for the user's company */
  companyUuid: string;
  /** User's email address */
  email: string;
  /** User's first name */
  givenName: string;
  /** User's last name */
  familyName: string;
  /** User's complete name */
  fullName: string;
  /** User's phone number (optional) */
  phoneNumber?: string;
  /** Whether the phone number has been verified (optional) */
  phoneNumberVerified?: boolean;
  /** Whether the user is a guest user */
  guest: boolean;
  /** Whether the user account is enabled */
  enabled: boolean;
  /** ISO 8601 date string indicating when the user was deactivated (optional) */
  deactivationDate?: string;
  /** Whether the user is a company delegate with special permissions */
  companyDelegate: boolean;
  /** Employee ID within the company (optional) */
  employeeId?: string;
  /** User's job title (optional) */
  title?: string;
  /** User's expense policy level */
  policyLevel: string;
  /** Unique identifier for the company's policy level */
  companyPolicyLevelUuid: string;
  /** User's department (optional) */
  department?: string;
  /** Billing entity for the user's expenses (optional) */
  billTo?: string;
  /** User's geographic region (optional) */
  region?: string;
  /** Company subsidiary the user belongs to (optional) */
  subsidiary?: string;
  /** Number of physical cards issued to the user */
  physicalCardCount: number;
  /** Current status of user's physical cards */
  physicalCardStatus: string;
  /** Unique identifier for the user's office location */
  companyOfficeUuid: string;
  /** Unique identifier for the user's manager (optional) */
  managerUuid?: string;
  /** Unique identifier for the user's travel approver (optional) */
  travelApproverUuid?: string;
  /** Whether hotel folio requests are enabled for the user */
  hotelFolioRequestEnabled: boolean;
};

export interface Merchant {
  /** Unique identifier for the merchant */
  uuid: string;
  /** Name of the merchant */
  name: string;
  /** URL to the merchant's logo image (optional) */
  logo?: string;
  /** Merchant category classification */
  category: string;
  /** Whether this is an online merchant */
  online: boolean;
  /** Whether this merchant is eligible for per diem expenses */
  perDiem: boolean;
  /** Time zone of the merchant location */
  timeZone: string;
  /** Formatted address of the merchant location */
  formattedAddress: string;
  /** Higher-level grouping of merchant categories */
  categoryGroup: string;
}

export type ReportingData = {
  /** Department associated with the expense (optional) */
  department?: string;
  /** Billing entity for the expense (optional) */
  billTo?: string;
  /** Geographic region for the expense (optional) */
  region?: string;
  /** Company subsidiary for the expense (optional) */
  subsidiary?: string;
  /** Unique identifier for the billable entity */
  billableEntityUuid: string;
};

/**
 * Represents a participant in an expense (e.g., attendee at a meal)
 * Contains basic user information for expense participants
 */
export type Participant = {
  /** Unique identifier for the participant */
  uuid: string;
  /** Participant's email address */
  email: string;
  /** Participant's first name */
  givenName: string;
  /** Participant's last name */
  familyName: string;
  /** Participant's complete name */
  fullName: string;
  /** Hash of the participant's profile picture (optional) */
  pictureHash?: string;
  /** Whether the participant is a guest user */
  guest: boolean;
  /** URL to the participant's profile picture (optional) */
  picture?: string;
};

/**
 * Contains tax-related information for an expense
 * Includes VAT details, tax calculations, and merchant tax information
 */
export type TaxDetails = {
  /** VAT registration number (optional) */
  vatNumber?: string;
  /** Array of individual tax line items */
  taxLines: Array<{
    /** Tax rate percentage (optional) */
    rate?: number;
    /** Tax amount (optional) */
    amount?: number;
    /** Description of the tax line (optional) */
    description?: string;
  }>;
  /** Country code for tax purposes */
  country: string;
  /** Address for tax purposes (optional) */
  address?: string;
  /** Whether this expense has no tax */
  noTax: boolean;
  /** Whether reverse charge VAT applies */
  reverseCharge: boolean;
  /** Whether tax details were synced from the ledger system */
  syncedFromLedger: boolean;
  /** Merchant name from the ledger system (optional) */
  ledgerMerchantName?: string;
  /** Whether tax rate is expressed as decimal */
  taxRateDecimal: boolean;
  /** Net amount before tax (optional) */
  netAmount?: number;
  /** Total tax amount (optional) */
  tax?: number;
  /** Gross amount including tax (optional) */
  grossAmount?: number;
};

/**
 * Detailed information about an expense
 * Contains metadata, custom fields, approvals, and various expense attributes
 */
export type Details = {
  /** Array of custom field values defined by the company */
  customFieldValues: Array<{
    /** Identifier of the custom field */
    fieldId: string;
    /** Value of the custom field */
    value: string | number | boolean;
  }>;
  /** General ledger code for accounting purposes (optional) */
  glCode?: string;
  /** ISO 8601 date string indicating when the expense detail was created */
  dateCreated: string;
  /** ISO 8601 date string indicating when the expense detail was last modified */
  dateModified: string;
  /** Unique identifier for the expense detail */
  id: string;
  /** Unique identifier for the company */
  companyUuid: string;
  /** Unique identifier for the user who created the expense */
  userUuid: string;
  /** Date when the expense was posted to the system (optional) */
  postedDate?: string;
  /** Array of participants involved in the expense */
  participants: Participant[];
  /** URL to related calendar event (optional) */
  calendarEventUrl?: string;
  /** Name of related calendar event (optional) */
  calendarEventName?: string;
  /** Location of related calendar event (optional) */
  calendarEventLocation?: string;
  /** Description of the expense (optional) */
  description?: string;
  /** Unique identifier of associated trip (optional) */
  tripUuid?: string;
  /** Whether this is a personal expense */
  personal: boolean;
  /** Amount marked as personal (optional) */
  personalAmount?: number;
  /** Personal amount in merchant currency (optional) */
  personalMerchantAmount?: number;
  /** Unique identifier of supplier (optional) */
  supplierUuid?: string;
  /** Tax details for the expense */
  taxDetails: TaxDetails;
  /** ISO 8601 date string when tax details were last updated */
  taxDetailsLastUpdatedOn: string;
  /** Unique identifier of user who last updated the expense */
  lastUpdatedByUserUuid: string;
  /** Whether the expense has been verified */
  verified: boolean;
  /** Whether the expense has been itemized */
  itemized: boolean;
  /** Unique identifier of user who itemized the expense (optional) */
  itemizedByUserUuid?: string;
  /** Unique identifier of the manager (optional) */
  managerUuid?: string;
  /** Unique identifier of the travel approver (optional) */
  travelApproverUuid?: string;
  /** Date on the invoice (optional) */
  invoiceDate?: string;
  /** Invoice number (optional) */
  invoiceNumber?: string;
  /** Estimated document date (optional) */
  estimatedDocumentDate?: string;
  /** Estimated document number (optional) */
  estimatedDocumentNumber?: string;
  /** Foreign exchange fee amount */
  fxFeeAmount: number;
  /** Foreign exchange fee percentage */
  fxFeePercentage: number;
  /** Direct reimbursement fee amount */
  directReimbursementFeeAmount: number;
  /** Direct reimbursement fee percentage */
  directReimbursementFeePercentage: number;
  /** Unique identifier of approver (optional) */
  approvedByUuid?: string;
  /** Email of approver (optional) */
  approvedByEmail?: string;
  /** Whether admin approval is required */
  adminApprovalRequired: boolean;
  /** Array of assigned approver UUIDs */
  assignedApproverUuids: string[];
};

/**
 * Contains information about expense flagging and policy violations
 * Includes refund details and reasons for flagging
 */
export type Flag = {
  /** Current flag status (optional) */
  status?: string;
  /** Map of flag reasons with their values */
  reasons: Record<string, string | number | boolean>;
  /** Primary reason for flagging (optional) */
  reason?: string;
  /** Amount to be refunded (optional) */
  refundAmount?: number;
  /** Policy-based refund amount (optional) */
  refundPolicyAmount?: number;
  /** Amount already refunded */
  refundedAmount: number;
  /** Policy-based amount already refunded */
  refundedPolicyAmount: number;
  /** Additional notes about the flag (optional) */
  note?: string;
  /** Reason for automatic rejection (optional) */
  autoRejectReason?: string;
  /** List of all applicable flag reasons */
  reasonList: string[];
  /** Admin notes about the flag (optional) */
  adminNote?: string;
};

/**
 * Describes an expense policy and its rules
 * Contains policy configuration, thresholds, and spending intervals
 */
export type PolicyDescription = {
  /** Type of policy */
  type: string;
  /** Unique identifier for custom policy (optional) */
  customPolicyUuid?: string;
  /** Name of the policy */
  name: string;
  /** Description of the policy */
  description: string;
  /** Custom merchant category groups for this policy (optional) */
  customPolicyMerchantCategoryGroups?: Record<string, unknown>;
  /** URL to policy picture/icon (optional) */
  picture?: string;
  /** URL to new policy picture/icon (optional) */
  newPicture?: string;
  /** Default spending intervals that trigger flags */
  defaultFlagSpendIntervals: string[];
  /** Default spending intervals that trigger declines */
  defaultDeclineSpendIntervals: string[];
  /** Warning amounts by category and threshold type */
  warningAmounts: Record<string, Record<string, number>>;
};

/**
 * HATEOAS-style links for expense-related resources
 * Provides navigation links to related endpoints
 */
export type Links = {
  /** Link to the expense resource itself */
  self: { href: string };
  /** Link to expense activity/history */
  activity: { href: string };
  /** Link to flag comments (optional) */
  flagComments?: { href: string };
  /** Link to edit action endpoint (optional) */
  'action.edit'?: { href: string };
  /** Link to related transactions (optional) */
  relatedTransactions?: { href: string };
};

/**
 * Main expense data structure for Navan API
 * Contains all information about a single expense including amounts, status, policies, and metadata
 */
export type Expense = {
  /** Date when reimbursement is scheduled (optional) */
  dateReimbursementScheduled?: string;
  /** ISO 8601 date string when the expense was created */
  dateCreated: string;
  /** ISO 8601 date string when the expense was last modified */
  dateModified: string;
  /** Unique identifier for the expense (optional - Navan API uses 'id' instead) */
  uuid?: string;
  /** Unique identifier for the expense (Navan API field) */
  id?: string;
  /** User who created the expense */
  user: User;
  /** Source of the expense (e.g., 'CARD', 'MANUAL', 'RECEIPT') */
  source: string;
  /** Plaid transaction data if expense is linked to a bank transaction (optional) */
  plaidTransaction?: {
    /** Plaid transaction ID */
    id?: string;
    /** Transaction amount */
    amount?: number;
    /** Plaid account ID */
    accountId?: string;
    /** Plaid category ID */
    categoryId?: string;
    /** Additional Plaid data */
    [key: string]: unknown;
  };
  /** Current status of the expense (e.g., 'SUBMITTED', 'APPROVED', 'REIMBURSED') */
  status: string;
  /** Method of reimbursement */
  reimbursementMethod: string;
  /** Date of the expense */
  date: string;
  /** ISO 8601 instant when the expense occurred */
  instant: string;
  /** Date when the expense was submitted */
  dateSubmitted: string;
  /** Date when the expense was approved (optional) */
  dateApproved?: string;
  /** Date when reimbursement was initiated (optional) */
  dateReimbursementInitiated?: string;
  /** Date when reimbursement was completed (optional) */
  dateReimbursementCompleted?: string;
  /** Amount in the user's account currency */
  accountAmount: number;
  /** Currency code for the account amount */
  accountCurrency: string;
  /** Amount in the merchant's currency */
  merchantAmount: number;
  /** Currency code for the merchant amount */
  merchantCurrency: string;
  /** Amount in the billable entity's currency */
  billableEntityAmount: number;
  /** Currency code for the billable entity amount */
  billableEntityCurrency: string;
  /** Amount approved for reimbursement */
  approvedAmount: number;
  /** Merchant information */
  merchant: Merchant;
  /** Reporting and organizational data */
  reportingData: ReportingData;
  /** Whether a receipt is required for this expense */
  receiptRequired: boolean;
  /** Key/ID for the uploaded receipt (optional) */
  receiptKey?: string;
  /** Key/ID for the receipt thumbnail (optional) */
  receiptThumbnailKey?: string;
  /** Number of pages in the receipt (optional) */
  receiptPageCount?: number;
  /** Detailed expense information */
  details: Details;
  /** Policy applied to this expense */
  policy: string;
  /** UUID of custom policy if applicable (optional) */
  customPolicyUuid?: string;
  /** ISO 8601 instant when policy was applied */
  policyAddedInstant: string;
  /** Whether the expense is flagged for review */
  flagged: boolean;
  /** Flag details if expense is flagged */
  flag: Flag;
  /** Amount to be reimbursed (optional) */
  reimbursementAmount?: number;
  /** Currency for reimbursement (optional) */
  reimbursementCurrency?: string;
  /** Reimbursement amount in account currency (optional) */
  reimbursementAccountAmount?: number;
  /** ID of the repayment transaction (optional) */
  repaymentId?: string;
  /** Array of associated booking UUIDs */
  bookingUuids: string[];
  /** Array of associated booking IDs */
  bookingIds: string[];
  /** UUID of associated credit line (optional) */
  creditLineUuid?: string;
  /** UUID of credit line transaction (optional) */
  creditLineTransactionUuid?: string;
  /** Primary currency for the expense */
  currency: string;
  /** Key/ID for electronic receipt (optional) */
  ereceiptKey?: string;
  /** Key/ID for electronic receipt thumbnail (optional) */
  ereceiptThumbnailKey?: string;
  /** Primary expense amount */
  amount: number;
  /** ISO 8601 instant when transaction was posted (optional) */
  postedInstant?: string;
  /** Type of charge (e.g., 'PURCHASE', 'REFUND') */
  chargeType: string;
  /** ISO 8601 instant when transaction was authorized */
  authorizationInstant: string;
  /** Date when transaction was authorized */
  authorizationDate: string;
  /** Type of reconciliation (optional) */
  reconciliationType?: string;
  /** Amount posted to the account */
  postedAmount: number;
  /** Revision ID of the user's policy at time of expense */
  userPolicyRevisionId: string;
  /** Amount approved according to policy */
  approvedPolicyAmount: number;
  /** Whether MCC (Merchant Category Code) can be updated */
  cardMccUpdateAllowed: boolean;
  /** UUID of associated trip (optional) */
  tripUuid?: string;
  /** Whether the expense has been itemized */
  itemized: boolean;
  /** Whether admin approval is required */
  adminApprovalRequired: boolean;
  /** Name of the applied policy */
  policyName: string;
  /** Price quote data (optional) */
  priceQuote?: Record<string, unknown>;
  /** UUID of the manager (optional) */
  managerUuid?: string;
  /** UUID of travel approver (optional) */
  travelApproverUuid?: string;
  /** Whether this is a mileage expense */
  mileageExpense: boolean;
  /** Whether this is a per diem expense */
  perDiemExpense: boolean;
  /** Whether this uses mileage expense v2 format */
  mileageExpenseV2: boolean;
  /** Whether this is a basic mileage expense */
  basicMileage: boolean;
  /** Whether this is an advanced mileage expense */
  advancedMileage: boolean;
  /** Whether this uses mileage expense v1 format */
  mileageExpenseV1: boolean;
  /** Whether this is a travel-related pay-later hotel transaction */
  travelRelatedPayLaterHotelTransaction: boolean;
  /** Internal trip data (optional) */
  _trip?: Record<string, unknown>;
  /** Internal bookings data (optional) */
  _bookings?: Array<Record<string, unknown>>;
  /** Type identifier for JSON-LD */
  '@type': string;
  /** Display-friendly merchant name */
  prettyMerchantName: string;
  /** Internal type identifier */
  _type: string;
  /** Whether only the date (not time) is relevant */
  dateOnly: boolean;
  /** Whether this qualifies as per diem */
  perDiem: boolean;
  /** Whether this expense is repayable */
  repayable: boolean;
  /** Array of tags associated with the expense */
  tags: string[];
  /** Array of flag descriptions */
  flagDescriptions: string[];
  /** Whether a GL code is required */
  glCodeRequired: boolean;
  /** Email of approver (optional) */
  approvedByEmail?: string;
  /** Amount according to policy */
  policyAmount: number;
  /** Currency for policy amount */
  policyCurrency: string;
  /** Whether no receipt is available */
  noReceipt: boolean;
  /** UUID of approver (optional) */
  approvedByUuid?: string;
  /** Whether user action is required */
  needsUserAction: boolean;
  /** Array of assigned approver UUIDs */
  assignedApproverUuids: string[];
  /** Whether the approver can be changed */
  canChangeApprover: boolean;
  /** Personal portion of the expense according to policy */
  personalPolicyAmount: number;
  /** Whether the expense was automatically rejected */
  autoRejected: boolean;
  /** Detailed policy description */
  policyDescription: PolicyDescription;
  /** HATEOAS links for related resources */
  _links: Links;
};

// Add validation class
export class ExpenseValidator {
  static validateExpenseId(expenseId: string): void {
    if (!expenseId || typeof expenseId !== 'string' || expenseId.trim().length === 0) {
      throw new Error('Invalid expense ID');
    }
  }

  static validateExpenseFilters(filters: ExpenseFilters): void {
    if (filters.minAmount && filters.minAmount < 0) {
      throw new Error('minAmount must be non-negative');
    }
  }

  static validateExpenseData(data: ExpenseCreatePayload): void {
    if (!data.merchantAmount || data.merchantAmount <= 0) {
      throw new Error('merchantAmount must be positive');
    }
    if (!data.merchantCurrency) {
      throw new Error('merchantCurrency is required');
    }
    if (!data.date) {
      throw new Error('date is required');
    }
    if (!data.merchant?.name) {
      throw new Error('merchant name is required');
    }
  }

  static validateExpenseUpdateData(data: Partial<ExpenseCreatePayload>): void {
    if (data.merchantAmount !== undefined && data.merchantAmount <= 0) {
      throw new Error('merchantAmount must be positive');
    }
  }
}
