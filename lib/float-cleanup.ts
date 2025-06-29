import { getAllFloatAccounts, deleteFloatAccount } from "./float-service"
import { getAllBranches } from "./branch-service"

/**
 * Cleans up orphaned float accounts that reference branches that no longer exist
 * @returns Object containing the number of orphaned accounts found and fixed
 */
export async function cleanupOrphanedFloatAccounts() {
  try {
    // Get all branches and float accounts
    const branches = await getAllBranches()
    const floatAccounts = await getAllFloatAccounts()

    // Create a set of valid branch IDs for faster lookup
    const validBranchIds = new Set(branches.map((branch) => branch.id))

    // Find orphaned accounts (accounts with branch IDs that don't exist)
    const orphanedAccounts = floatAccounts.filter((account) => !validBranchIds.has(account.branchId))

    console.log(`Found ${orphanedAccounts.length} orphaned float accounts`)

    // Delete orphaned accounts
    for (const account of orphanedAccounts) {
      console.log(`Deleting orphaned float account: ${account.id} (Branch: ${account.branchId})`)
      await deleteFloatAccount(account.id)
    }

    return {
      orphanedAccountsFound: orphanedAccounts.length,
      orphanedAccountsDeleted: orphanedAccounts.length,
    }
  } catch (error) {
    console.error("Error cleaning up orphaned float accounts:", error)
    return {
      orphanedAccountsFound: 0,
      orphanedAccountsDeleted: 0,
      error: String(error),
    }
  }
}
