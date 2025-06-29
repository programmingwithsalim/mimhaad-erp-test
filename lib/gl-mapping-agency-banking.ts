/**
 * GL Mapping for Agency Banking
 *
 * This module provides specific GL mappings for Agency Banking transactions.
 */

import type { GLAccountMapping } from "./gl-mapping"

/**
 * Default GL mappings for Agency Banking transactions
 */
export const agencyBankingGLMappings: GLAccountMapping[] = [
  // Deposit: Customer deposits money to their bank account
  // DR: Cash in Till (Asset increases)
  // CR: Agency Banking Float (Liability increases)
  {
    id: "mapping-agency-banking-deposit",
    serviceModule: "agency-banking",
    transactionType: "deposit",
    debitAccountId: "1003", // Cash in Till (Asset)
    creditAccountId: "2101", // Agency Banking Float (Liability)
    description: "Agency Banking Deposit",
    isActive: true,
  },

  // Withdrawal: Customer withdraws money from their bank account
  // DR: Agency Banking Float (Liability decreases)
  // CR: Cash in Till (Asset decreases)
  {
    id: "mapping-agency-banking-withdrawal",
    serviceModule: "agency-banking",
    transactionType: "withdrawal",
    debitAccountId: "2101", // Agency Banking Float (Liability)
    creditAccountId: "1003", // Cash in Till (Asset)
    description: "Agency Banking Withdrawal",
    isActive: true,
  },

  // Interbank Transfer: Customer transfers money between banks
  // DR: Cash in Till (Asset increases) - for the amount + fee
  // CR: Agency Banking Float (Liability increases) - for the amount
  // CR: Fee Income (Revenue increases) - for the fee
  {
    id: "mapping-agency-banking-interbank-amount",
    serviceModule: "agency-banking",
    transactionType: "interbank",
    debitAccountId: "1003", // Cash in Till (Asset)
    creditAccountId: "2101", // Agency Banking Float (Liability)
    description: "Agency Banking Interbank Transfer - Principal",
    isActive: true,
    conditions: [
      {
        field: "isFeePortion",
        operator: "equals",
        value: false,
      },
    ],
  },
  {
    id: "mapping-agency-banking-interbank-fee",
    serviceModule: "agency-banking",
    transactionType: "interbank",
    debitAccountId: "1003", // Cash in Till (Asset)
    creditAccountId: "4101", // Fee Income (Revenue)
    description: "Agency Banking Interbank Transfer - Fee",
    isActive: true,
    conditions: [
      {
        field: "isFeePortion",
        operator: "equals",
        value: true,
      },
    ],
  },

  // Commission: Bank pays commission for agency banking services
  // DR: Accounts Receivable (Asset increases)
  // CR: Commission Income (Revenue increases)
  {
    id: "mapping-agency-banking-commission",
    serviceModule: "agency-banking",
    transactionType: "commission",
    debitAccountId: "1200", // Accounts Receivable (Asset)
    creditAccountId: "4102", // Commission Income (Revenue)
    description: "Agency Banking Commission",
    isActive: true,
  },
]
