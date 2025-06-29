import { create } from "zustand"
import { toast } from "@/components/ui/use-toast"

export interface FloatAccount {
  id: string
  accountType: string
  branchId: string
  branchName?: string
  provider?: string
  accountNumber?: string
  currentBalance: number
  minThreshold: number
  maxThreshold: number
  lastUpdated: string
  createdBy: string
  createdAt: string
}

interface FloatState {
  accounts: FloatAccount[]
  isLoading: boolean
  error: string | null
  fetchAccounts: () => Promise<void>
  getFloatAccount: (branchId: string, accountType: string) => FloatAccount | undefined
  upsertFloatAccount: (account: FloatAccount) => Promise<void>
  deleteFloatAccount: (id: string) => Promise<void>
}

export const useFloatStore = create<FloatState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,
  fetchAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch("/api/float-accounts")
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`)
      }
      const data = await response.json()

      // Handle different response formats
      const accounts = Array.isArray(data) ? data : data.floatAccounts || data.accounts || []

      set({ accounts, isLoading: false })
    } catch (error) {
      console.error("Error fetching float accounts:", error)
      set({
        error: error instanceof Error ? error.message : "Failed to fetch accounts",
        isLoading: false,
      })
    }
  },
  getFloatAccount: (branchId, accountType) => {
    return get().accounts.find((account) => account.branchId === branchId && account.accountType === accountType)
  },
  upsertFloatAccount: async (account) => {
    set({ isLoading: true, error: null })
    try {
      // Check if account exists (has an ID and exists in the store)
      const isUpdate = account.id && get().accounts.some((a) => a.id === account.id)

      const url = isUpdate ? `/api/float-accounts/${account.id}` : "/api/float-accounts"

      const method = isUpdate ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(account),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isUpdate ? "update" : "create"} account: ${response.status}`)
      }

      const updatedAccount = await response.json()

      // Update local state
      set((state) => ({
        accounts: isUpdate
          ? state.accounts.map((a) => (a.id === account.id ? updatedAccount : a))
          : [...state.accounts, updatedAccount],
        isLoading: false,
      }))

      toast({
        title: `Account ${isUpdate ? "updated" : "created"} successfully`,
        description: `The float account has been ${isUpdate ? "updated" : "created"}.`,
      })
    } catch (error) {
      console.error(`Error ${account.id ? "updating" : "creating"} float account:`, error)
      set({
        error: error instanceof Error ? error.message : "Failed to save account",
        isLoading: false,
      })

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save account",
        variant: "destructive",
      })
    }
  },
  deleteFloatAccount: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/float-accounts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete account: ${response.status}`)
      }

      // Update local state
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        isLoading: false,
      }))

      toast({
        title: "Account deleted successfully",
        description: "The float account has been deleted.",
      })
    } catch (error) {
      console.error("Error deleting float account:", error)
      set({
        error: error instanceof Error ? error.message : "Failed to delete account",
        isLoading: false,
      })

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      })
    }
  },
}))
