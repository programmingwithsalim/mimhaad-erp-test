import { NextResponse } from "next/server"
import { BranchAwareFloatGLService } from "@/lib/float-gl-mapping-service-option-b"

export async function GET() {
  try {
    const [accountsByBranchAndProvider, glAccountsWithBranches, branchPerformance] = await Promise.all([
      BranchAwareFloatGLService.getFloatAccountsByBranchAndProvider(),
      BranchAwareFloatGLService.getGLAccountsWithBranchMappings(),
      BranchAwareFloatGLService.getBranchPerformanceReport(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        floatAccounts: accountsByBranchAndProvider,
        glAccounts: glAccountsWithBranches,
        branchPerformance,
      },
    })
  } catch (error) {
    console.error("Error in branch-aware mapping API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    switch (action) {
      case "auto-map":
        const autoMapResult = await BranchAwareFloatGLService.autoMapByProvider()
        return NextResponse.json({
          success: true,
          data: autoMapResult,
        })

      case "sync-balances":
        const syncResult = await BranchAwareFloatGLService.syncAggregatedBalances()
        return NextResponse.json({
          success: true,
          data: syncResult,
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Error in branch-aware mapping POST:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
