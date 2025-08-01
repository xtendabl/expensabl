/**
 * Type definitions for the /search/transactions endpoint response
 * These types match the actual API response structure
 */

/**
 * Merchant information in search results
 */
export interface SearchTransactionMerchant {
  uuid: string;
  name: string;
  logo?: string;
  online: boolean;
  perDiem: boolean;
  timeZone: string;
  formattedAddress: string;
  categoryGroup: string;
}

/**
 * Flag metadata for policy violations
 */
export interface FlagMetadata {
  reason: string;
  amount: number | null;
  currency: string;
  maxAmount: number | null;
  transactionPolicyAmount: number | null;
  itemizedAmount: number | null;
  policyName: string | null;
  distance: number | null;
  expectedDistance: number | null;
  unit: string | null;
  expenseLateSubmissionThreshold: number | null;
}

/**
 * Flag information for expense violations
 */
export interface SearchTransactionFlag {
  status: string;
  refundAmount: number | null;
  refundPolicyAmount: number | null;
  refundedAmount: number;
  refundedPolicyAmount: number;
  reasons: string[];
  adminNote: string | null;
  reviewed: boolean;
  spendIntervalFromDate: string | null;
  spendIntervalToDate: string | null;
  metadata: FlagMetadata[];
}

/**
 * Expense properties containing status and reimbursement info
 */
export interface ExpenseProperties {
  status: string;
  dateOnly: boolean;
  mileage: boolean;
  reimbursementMethod: string | null;
  dateSubmitted: string;
  dateApproved: string | null;
  dateReimbursementInitiated: string | null;
  dateReimbursementCompleted: string | null;
  dateReimbursementScheduled: string | null;
  reimbursementAmount: number | null;
  reimbursementCurrency: string | null;
  perDiemExpense: boolean;
  airwallexPaymentStatus: string | null;
  modernTreasuryPaymentOrderStatus: string | null;
  userReimbursementBatchStatus: string | null;
  companyReimbursementBatchUuid: string | null;
  fundingVendor: string | null;
}

/**
 * HATEOAS links for the expense
 */
export interface SearchTransactionLinks {
  self: {
    href: string;
  };
}

/**
 * Individual transaction/expense from search results
 */
export interface SearchTransaction {
  id: string;
  _type: string;
  authorizationInstant: string;
  authorizationDate: string;
  dateModified: string;
  postedInstant: string | null;
  accountAmount: number;
  accountCurrency: string;
  merchantAmount: number;
  merchantCurrency: string;
  policyAmount: number;
  policyCurrency: string;
  approvedAmount: number | null;
  merchant: SearchTransactionMerchant;
  prettyMerchantName: string;
  receiptRequired: boolean;
  noReceipt: boolean;
  hasReceipt: boolean;
  personal: boolean;
  flagged: boolean;
  needsUserAction: boolean;
  flag: SearchTransactionFlag;
  chargeType: string | null;
  policyType: string;
  policyName: string;
  expenseProperties: ExpenseProperties;
  itemized: boolean;
  lineItems: any[] | null;
  tripUuid: string | null;
  tripName: string | null;
  customFieldValues: any[];
  repayable: boolean;
  instant: string;
  reimbursementStatus: string | null;
  _links: SearchTransactionLinks;
}

/**
 * Response from /search/transactions endpoint
 */
export interface SearchTransactionsResponse {
  data: SearchTransaction[];
}

/**
 * Simplified display data extracted from SearchTransaction
 */
export interface SearchTransactionDisplay {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  category: string;
  flagged: boolean;
  policyViolations: string[];
}
