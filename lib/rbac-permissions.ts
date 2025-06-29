// Comprehensive permission definitions
export const PERMISSIONS = {
  // Transaction Processing
  MOMO_PROCESS: "momo:process",
  AGENCY_PROCESS: "agency-banking:process",
  EZWICH_PROCESS: "e-zwich:process",
  PAYMENTS_PROCESS: "payments:process",
  RECEIPTS_PROCESS: "receipts:process",

  // Transaction Management
  TRANSACTIONS_INITIATE: "transactions:initiate",
  TRANSACTIONS_VERIFY: "transactions:verify",
  TRANSACTIONS_APPROVE: "transactions:approve",
  TRANSACTIONS_VIEW: "transactions:view",

  // Till and Cash Management
  TILL_VIEW: "till:view",
  CASH_VIEW: "cash:view",
  CASH_MANAGE: "cash:manage",

  // Transfers and Funds
  TRANSFERS_SMALL: "transfers:small",
  TRANSFERS_LARGE: "transfers:large",
  TRANSFERS_APPROVE: "transfers:approve",
  FUNDS_TRANSFER: "funds:transfer",
  WALLETS_TRANSFER: "wallets:transfer",
  BANKS_TRANSFER: "banks:transfer",

  // Operations
  OPERATIONS_OVERRIDE: "operations:override",
  CUSTOMERS_VERIFY: "customers:verify",
  FLOAT_REQUEST: "float:request",
  FLOAT_APPROVE: "float:approve",

  // Reports and Finance
  REPORTS_ALL: "reports:all",
  ACCOUNTS_RECONCILE: "accounts:reconcile",
  AUDIT_ACCESS: "audit:access",
  GL_MANAGE: "gl:manage",
  FINANCIAL_REPORTS: "financial:reports",
  RECONCILIATION_ALL: "reconciliation:all",
  STATEMENTS_GENERATE: "statements:generate",

  // User Management
  USERS_MANAGE: "users:manage",
  USERS_VIEW: "users:view",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Transaction value limits by role
export const TRANSACTION_LIMITS = {
  cashier: {
    maxSingleTransaction: 5000,
    maxDailyTotal: 50000,
  },
  operations: {
    maxSingleTransaction: 10000,
    maxDailyTotal: 100000,
    maxTransferAmount: 25000,
  },
  manager: {
    maxSingleTransaction: 100000,
    maxDailyTotal: 500000,
    maxTransferAmount: 100000,
  },
  finance: {
    maxSingleTransaction: Number.POSITIVE_INFINITY,
    maxDailyTotal: Number.POSITIVE_INFINITY,
    maxTransferAmount: Number.POSITIVE_INFINITY,
  },
  admin: {
    maxSingleTransaction: Number.POSITIVE_INFINITY,
    maxDailyTotal: Number.POSITIVE_INFINITY,
    maxTransferAmount: Number.POSITIVE_INFINITY,
  },
} as const
