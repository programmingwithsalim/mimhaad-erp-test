"use server"

import {
  getAllFloatAccounts,
  getFloatAccountById,
  getFloatAccountsByBranchId,
  createFloatAccount,
  updateFloatAccount,
  deleteFloatAccount,
  getAllFloatTransactions,
  getFloatTransactionsByAccountId,
  getFloatTransactionsByBranchId,
  createFloatTransaction,
  getFloatStatistics,
  syncFloatWithBranchData,
  getLowBalanceFloatAccounts,
  getExcessBalanceFloatAccounts,
  type FloatAccount,
  type FloatTransaction,
} from "./float-service"

// Float account actions
export async function fetchFloatAccounts() {
  try {
    const data = await getAllFloatAccounts()
    return { data }
  } catch (error) {
    console.error("Error fetching float accounts:", error)
    return { error: "Failed to fetch float accounts" }
  }
}

export async function fetchFloatAccountById(id: string) {
  try {
    const data = await getFloatAccountById(id)
    if (!data) {
      return { error: "Float account not found" }
    }
    return { data }
  } catch (error) {
    console.error(`Error fetching float account ${id}:`, error)
    return { error: "Failed to fetch float account" }
  }
}

export async function fetchFloatAccountsByBranchId(branchId: string) {
  try {
    const data = await getFloatAccountsByBranchId(branchId)
    return { data }
  } catch (error) {
    console.error(`Error fetching float accounts for branch ${branchId}:`, error)
    return { error: "Failed to fetch float accounts for branch" }
  }
}

export async function addFloatAccount(accountData: Omit<FloatAccount, "id" | "lastUpdated" | "createdAt">) {
  try {
    const data = await createFloatAccount(accountData)
    return { data }
  } catch (error) {
    console.error("Error adding float account:", error)
    return { error: "Failed to add float account" }
  }
}

export async function updateFloatAccountAction(
  id: string,
  accountData: Partial<Omit<FloatAccount, "id" | "createdAt">>,
) {
  try {
    const data = await updateFloatAccount(id, accountData)
    if (!data) {
      return { error: "Float account not found" }
    }
    return { data }
  } catch (error) {
    console.error(`Error updating float account ${id}:`, error)
    return { error: "Failed to update float account" }
  }
}

export async function removeFloatAccount(id: string) {
  try {
    const success = await deleteFloatAccount(id)
    if (!success) {
      return { error: "Float account not found" }
    }
    return { success }
  } catch (error) {
    console.error(`Error removing float account ${id}:`, error)
    return { error: "Failed to remove float account" }
  }
}

// Float transaction actions
export async function fetchFloatTransactions() {
  try {
    const data = await getAllFloatTransactions()
    return { data }
  } catch (error) {
    console.error("Error fetching float transactions:", error)
    return { error: "Failed to fetch float transactions" }
  }
}

export async function fetchFloatTransactionsByAccountId(accountId: string) {
  try {
    const data = await getFloatTransactionsByAccountId(accountId)
    return { data }
  } catch (error) {
    console.error(`Error fetching float transactions for account ${accountId}:`, error)
    return { error: "Failed to fetch float transactions for account" }
  }
}

export async function fetchFloatTransactionsByBranchId(branchId: string) {
  try {
    const data = await getFloatTransactionsByBranchId(branchId)
    return { data }
  } catch (error) {
    console.error(`Error fetching float transactions for branch ${branchId}:`, error)
    return { error: "Failed to fetch float transactions for branch" }
  }
}

export async function addFloatTransaction(
  transactionData: Omit<FloatTransaction, "id" | "previousBalance" | "newBalance" | "timestamp">,
) {
  try {
    const data = await createFloatTransaction(transactionData)
    return { data }
  } catch (error) {
    console.error("Error adding float transaction:", error)
    return { error: "Failed to add float transaction", details: (error as Error).message }
  }
}

// Float statistics and synchronization actions
export async function fetchFloatStatistics() {
  try {
    const data = await getFloatStatistics()
    return { data }
  } catch (error) {
    console.error("Error fetching float statistics:", error)
    return { error: "Failed to fetch float statistics" }
  }
}

export async function syncFloatBranchData() {
  try {
    const success = await syncFloatWithBranchData()
    if (!success) {
      return { error: "Failed to synchronize data" }
    }
    return { success }
  } catch (error) {
    console.error("Error synchronizing float and branch data:", error)
    return { error: "Failed to synchronize data" }
  }
}

export async function fetchLowBalanceFloatAccounts() {
  try {
    const data = await getLowBalanceFloatAccounts()
    return { data }
  } catch (error) {
    console.error("Error fetching low balance float accounts:", error)
    return { error: "Failed to fetch low balance float accounts" }
  }
}

export async function fetchExcessBalanceFloatAccounts() {
  try {
    const data = await getExcessBalanceFloatAccounts()
    return { data }
  } catch (error) {
    console.error("Error fetching excess balance float accounts:", error)
    return { error: "Failed to fetch excess balance float accounts" }
  }
}
