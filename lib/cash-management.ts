import { create } from "zustand"
import { persist } from "zustand/middleware"

// Define transaction types
export type TransactionType =
  | "momo-cash-in"
  | "momo-cash-out"
  | "ezwich-issue"
  | "ezwich-withdrawal"
  | "agency-deposit"
  | "agency-withdrawal"
  | "jumia-collection"
  | "jumia-settlement"
  | "power-sale"
  | "manual-adjustment"

export interface Transaction {
  id: string
  branchId: string
  amount: number
  type: TransactionType | string
  description: string
  timestamp: string
  serviceModule: string
  affectedBalance: number // Balance after transaction
  userId: string
}

interface CashState {
  // Map of branchId to cash balance
  branchCashBalances: Record<string, number>
  // Transaction history
  transactions: Transaction[]
  // Update cash balance for a branch
  updateCashBalance: (
    branchId: string,
    amount: number,
    transactionDetails: Omit<Transaction, "id" | "timestamp" | "affectedBalance">,
  ) => void
  // Get cash balance for a branch
  getCashBalance: (branchId: string) => number
  // Get transactions for a branch
  getBranchTransactions: (branchId: string) => Transaction[]
}

// Create the store with persistence
export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      branchCashBalances: {},
      transactions: [],

      updateCashBalance: (branchId, amount, transactionDetails) => {
        set((state) => {
          // Get current balance or default to 0
          const currentBalance = state.branchCashBalances[branchId] || 0
          // Calculate new balance
          const newBalance = currentBalance + amount

          // Create transaction record
          const transaction: Transaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            branchId,
            amount,
            timestamp: new Date().toISOString(),
            affectedBalance: newBalance,
            ...transactionDetails,
          }

          // Update branch balance and add transaction to history
          const newState = {
            branchCashBalances: {
              ...state.branchCashBalances,
              [branchId]: newBalance,
            },
            transactions: [transaction, ...state.transactions],
          }

          // Notify listeners immediately after state update
          cashEvents.notify(branchId, newBalance)

          return newState
        })
      },

      getCashBalance: (branchId) => {
        return get().branchCashBalances[branchId] || 0
      },

      getBranchTransactions: (branchId) => {
        return get().transactions.filter((tx) => tx.branchId === branchId)
      },
    }),
    {
      name: "cash-till-storage",
    },
  ),
)

// Event emitter for real-time updates
type Listener = (branchId: string, newBalance: number) => void
const listeners: Listener[] = []

export const cashEvents = {
  subscribe: (listener: Listener) => {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  },

  notify: (branchId: string, newBalance: number) => {
    listeners.forEach((listener) => listener(branchId, newBalance))
  },
}
