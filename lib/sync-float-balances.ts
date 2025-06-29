import { getAllFloatAccounts } from "./float-service"
import { getAllBranches, updateBranch } from "./branch-service"

/**
 * Synchronizes float balances with branch data
 * @returns Object containing the number of branches updated
 */
export async function syncFloatBalances() {
  try {
    // Get all branches and float accounts
    const branches = await getAllBranches()
    const floatAccounts = await getAllFloatAccounts()

    // Create a map to store total float balance per branch
    const branchFloatBalances = new Map<string, number>()

    // Calculate total float balance for each branch
    for (const account of floatAccounts) {
      const { branchId, currentBalance } = account
      const currentTotal = branchFloatBalances.get(branchId) || 0
      branchFloatBalances.set(branchId, currentTotal + currentBalance)
    }

    // Update branch float balances
    let updatedCount = 0
    for (const branch of branches) {
      const floatBalance = branchFloatBalances.get(branch.id) || 0

      // Only update if the float balance has changed
      if (branch.floatBalance !== floatBalance) {
        await updateBranch(branch.id, {
          floatBalance,
          lastFloatUpdate: new Date().toISOString(),
        })
        updatedCount++
      }
    }

    return {
      branchesUpdated: updatedCount,
      totalBranches: branches.length,
    }
  } catch (error) {
    console.error("Error synchronizing float balances:", error)
    return {
      branchesUpdated: 0,
      totalBranches: 0,
      error: String(error),
    }
  }
}
