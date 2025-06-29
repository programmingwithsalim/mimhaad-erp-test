import { NextResponse } from "next/server"
import { useBranchStore } from "@/lib/branch-store"
import { useFloatStore } from "@/lib/float-management"

export async function POST() {
  try {
    // Get all valid branch IDs
    const { branches } = useBranchStore.getState()
    const validBranchIds = branches.map((branch) => branch.id)

    // Clean up orphaned accounts
    const { cleanupOrphanedAccounts } = useFloatStore.getState()
    const result = cleanupOrphanedAccounts(validBranchIds)

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Removed ${result.removed} orphaned accounts. ${result.remaining} accounts remain.`,
      orphanedAccountsDeleted: result.removed,
    })
  } catch (error) {
    console.error("Error cleaning up orphaned accounts:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clean up orphaned accounts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
