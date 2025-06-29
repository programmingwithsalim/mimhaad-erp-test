import { NextResponse } from "next/server"
import { useBranchStore } from "@/lib/branch-store"
import { useFloatStore } from "@/lib/float-management"

export async function POST() {
  try {
    // Get all branches and float accounts
    const { branches, updateBranch } = useBranchStore.getState()
    const { floatAccounts } = useFloatStore.getState()

    // Calculate total float balance for each branch
    const branchFloatTotals: Record<string, number> = {}

    Object.values(floatAccounts).forEach((account) => {
      if (!branchFloatTotals[account.branchId]) {
        branchFloatTotals[account.branchId] = 0
      }
      branchFloatTotals[account.branchId] += account.currentBalance
    })

    // Update branch data with float balances
    let branchesUpdated = 0

    branches.forEach((branch) => {
      const floatBalance = branchFloatTotals[branch.id] || 0

      // Only update if the float balance has changed
      if (branch.floatBalance !== floatBalance) {
        updateBranch({
          ...branch,
          floatBalance,
          lastUpdated: new Date().toISOString(),
        })
        branchesUpdated++
      }
    })

    return NextResponse.json({
      success: true,
      message: `Sync completed. Updated float balances for ${branchesUpdated} branches.`,
      branchesUpdated,
    })
  } catch (error) {
    console.error("Error syncing float balances:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync float balances",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
