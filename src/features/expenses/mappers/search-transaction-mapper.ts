import {
  SearchTransaction,
  SearchTransactionMerchant,
  SearchTransactionFlag,
  ExpenseProperties,
  SearchTransactionLinks,
  FlagMetadata,
  SearchTransactionDisplay,
} from '../types/search-transaction.types';
import { error as logError } from '../../../shared/services/logger/chrome-logger-setup';

/**
 * Maps merchant data from search API response
 */
function mapSearchMerchant(data: any): SearchTransactionMerchant {
  if (!data) {
    return {
      uuid: '',
      name: 'Unknown Merchant',
      online: false,
      perDiem: false,
      timeZone: 'Z',
      formattedAddress: '',
      categoryGroup: 'OTHER',
    };
  }

  return {
    uuid: data.uuid || '',
    name: data.name || 'Unknown Merchant',
    logo: data.logo,
    online: Boolean(data.online),
    perDiem: Boolean(data.perDiem),
    timeZone: data.timeZone || 'Z',
    formattedAddress: data.formattedAddress || '',
    categoryGroup: data.categoryGroup || 'OTHER',
  };
}

/**
 * Maps flag metadata from search API response
 */
function mapFlagMetadata(data: any): FlagMetadata {
  return {
    reason: data.reason || '',
    amount: data.amount ?? null,
    currency: data.currency || 'USD',
    maxAmount: data.maxAmount ?? null,
    transactionPolicyAmount: data.transactionPolicyAmount ?? null,
    itemizedAmount: data.itemizedAmount ?? null,
    policyName: data.policyName ?? null,
    distance: data.distance ?? null,
    expectedDistance: data.expectedDistance ?? null,
    unit: data.unit ?? null,
    expenseLateSubmissionThreshold: data.expenseLateSubmissionThreshold ?? null,
  };
}

/**
 * Maps flag data from search API response
 */
function mapSearchFlag(data: any): SearchTransactionFlag {
  if (!data) {
    return {
      status: '',
      refundAmount: null,
      refundPolicyAmount: null,
      refundedAmount: 0,
      refundedPolicyAmount: 0,
      reasons: [],
      adminNote: null,
      reviewed: false,
      spendIntervalFromDate: null,
      spendIntervalToDate: null,
      metadata: [],
    };
  }

  return {
    status: data.status || '',
    refundAmount: data.refundAmount ?? null,
    refundPolicyAmount: data.refundPolicyAmount ?? null,
    refundedAmount: data.refundedAmount || 0,
    refundedPolicyAmount: data.refundedPolicyAmount || 0,
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    adminNote: data.adminNote ?? null,
    reviewed: Boolean(data.reviewed),
    spendIntervalFromDate: data.spendIntervalFromDate ?? null,
    spendIntervalToDate: data.spendIntervalToDate ?? null,
    metadata: Array.isArray(data.metadata) ? data.metadata.map(mapFlagMetadata) : [],
  };
}

/**
 * Maps expense properties from search API response
 */
function mapExpenseProperties(data: any): ExpenseProperties {
  if (!data) {
    return {
      status: 'UNKNOWN',
      dateOnly: true,
      mileage: false,
      reimbursementMethod: null,
      dateSubmitted: new Date().toISOString(),
      dateApproved: null,
      dateReimbursementInitiated: null,
      dateReimbursementCompleted: null,
      dateReimbursementScheduled: null,
      reimbursementAmount: null,
      reimbursementCurrency: null,
      perDiemExpense: false,
      airwallexPaymentStatus: null,
      modernTreasuryPaymentOrderStatus: null,
      userReimbursementBatchStatus: null,
      companyReimbursementBatchUuid: null,
      fundingVendor: null,
    };
  }

  return {
    status: data.status || 'UNKNOWN',
    dateOnly: Boolean(data.dateOnly),
    mileage: Boolean(data.mileage),
    reimbursementMethod: data.reimbursementMethod ?? null,
    dateSubmitted: data.dateSubmitted || new Date().toISOString(),
    dateApproved: data.dateApproved ?? null,
    dateReimbursementInitiated: data.dateReimbursementInitiated ?? null,
    dateReimbursementCompleted: data.dateReimbursementCompleted ?? null,
    dateReimbursementScheduled: data.dateReimbursementScheduled ?? null,
    reimbursementAmount: data.reimbursementAmount ?? null,
    reimbursementCurrency: data.reimbursementCurrency ?? null,
    perDiemExpense: Boolean(data.perDiemExpense),
    airwallexPaymentStatus: data.airwallexPaymentStatus ?? null,
    modernTreasuryPaymentOrderStatus: data.modernTreasuryPaymentOrderStatus ?? null,
    userReimbursementBatchStatus: data.userReimbursementBatchStatus ?? null,
    companyReimbursementBatchUuid: data.companyReimbursementBatchUuid ?? null,
    fundingVendor: data.fundingVendor ?? null,
  };
}

/**
 * Maps links from search API response
 */
function mapSearchLinks(data: any): SearchTransactionLinks {
  if (!data) {
    return {
      self: { href: '' },
    };
  }

  return {
    self: data.self || { href: '' },
  };
}

/**
 * Maps a single search transaction from the API response
 */
export function mapSearchTransaction(data: any): SearchTransaction {
  if (!data) {
    throw new Error('Cannot map null or undefined transaction data');
  }

  return {
    id: data.id || '',
    _type: data._type || 'urn:tripactions:liquid:schema:expense',
    authorizationInstant: data.authorizationInstant || new Date().toISOString(),
    authorizationDate: data.authorizationDate || new Date().toISOString().split('T')[0],
    dateModified: data.dateModified || new Date().toISOString(),
    postedInstant: data.postedInstant ?? null,
    accountAmount: data.accountAmount || 0,
    accountCurrency: data.accountCurrency || 'USD',
    merchantAmount: data.merchantAmount || 0,
    merchantCurrency: data.merchantCurrency || 'USD',
    policyAmount: data.policyAmount || 0,
    policyCurrency: data.policyCurrency || 'USD',
    approvedAmount: data.approvedAmount ?? null,
    merchant: mapSearchMerchant(data.merchant),
    prettyMerchantName: data.prettyMerchantName || data.merchant?.name || 'Unknown',
    receiptRequired: Boolean(data.receiptRequired),
    noReceipt: Boolean(data.noReceipt),
    hasReceipt: Boolean(data.hasReceipt),
    personal: Boolean(data.personal),
    flagged: Boolean(data.flagged),
    needsUserAction: Boolean(data.needsUserAction),
    flag: mapSearchFlag(data.flag),
    chargeType: data.chargeType ?? null,
    policyType: data.policyType || '',
    policyName: data.policyName || '',
    expenseProperties: mapExpenseProperties(data.expenseProperties),
    itemized: Boolean(data.itemized),
    lineItems: data.lineItems ?? null,
    tripUuid: data.tripUuid ?? null,
    tripName: data.tripName ?? null,
    customFieldValues: Array.isArray(data.customFieldValues) ? data.customFieldValues : [],
    repayable: Boolean(data.repayable),
    instant: data.instant || data.authorizationInstant || new Date().toISOString(),
    reimbursementStatus: data.reimbursementStatus ?? null,
    _links: mapSearchLinks(data._links),
  };
}

/**
 * Maps an array of search transactions from the API response
 */
export function mapSearchTransactionArray(dataArray: any[]): SearchTransaction[] {
  if (!Array.isArray(dataArray)) {
    return [];
  }

  return dataArray
    .map((data) => {
      try {
        return mapSearchTransaction(data);
      } catch (error) {
        logError('Failed to map search transaction:', { error, data });
        return null;
      }
    })
    .filter((transaction): transaction is SearchTransaction => transaction !== null);
}

/**
 * Extracts display-friendly data from a search transaction
 */
export function getSearchTransactionDisplayData(
  transaction: SearchTransaction
): SearchTransactionDisplay {
  return {
    id: transaction.id,
    merchant: transaction.merchant.name,
    amount: transaction.merchantAmount,
    currency: transaction.merchantCurrency,
    date: transaction.authorizationDate,
    status: transaction.expenseProperties.status,
    category: transaction.merchant.categoryGroup,
    flagged: transaction.flagged,
    policyViolations: transaction.flag.reasons,
  };
}

/**
 * Converts SearchTransaction to ExpenseCreatePayload for creating new expenses
 */
export function searchTransactionToCreatePayload(transaction: SearchTransaction): any {
  return {
    merchantAmount: transaction.merchantAmount,
    merchantCurrency: transaction.merchantCurrency,
    date: new Date().toISOString().split('T')[0], // Today's date for new expenses
    merchant: { name: transaction.merchant.name },
    policyType: transaction.policyType || undefined,
    details: {
      category: transaction.merchant.categoryGroup,
      description: transaction.policyName,
    },
  };
}

/**
 * Converts SearchTransaction to a format compatible with the legacy Expense type
 * Use this for backward compatibility when needed
 */
export function searchTransactionToExpense(transaction: SearchTransaction): any {
  return {
    // Use only fields that actually exist
    id: transaction.id,
    date: transaction.authorizationDate,
    dateModified: transaction.dateModified,
    status: transaction.expenseProperties.status,

    // Amounts
    amount: transaction.merchantAmount,
    currency: transaction.merchantCurrency,
    merchantAmount: transaction.merchantAmount,
    merchantCurrency: transaction.merchantCurrency,
    accountAmount: transaction.accountAmount,
    accountCurrency: transaction.accountCurrency,

    // Merchant info
    merchant: transaction.merchant,
    prettyMerchantName: transaction.prettyMerchantName,

    // Status flags
    flagged: transaction.flagged,
    flag: transaction.flag,

    // Dates from expense properties
    dateSubmitted: transaction.expenseProperties.dateSubmitted,
    dateApproved: transaction.expenseProperties.dateApproved,

    // Policy
    policy: transaction.policyType,
    policyName: transaction.policyName,

    // Receipt info
    receiptRequired: transaction.receiptRequired,
    noReceipt: transaction.noReceipt,

    // Other fields
    tripUuid: transaction.tripUuid,
    customFieldValues: transaction.customFieldValues,

    // Type info
    '@type': transaction._type,
    _type: 'expense',

    // Links
    _links: transaction._links,
  };
}
