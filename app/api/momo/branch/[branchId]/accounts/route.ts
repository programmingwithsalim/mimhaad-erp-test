import { type NextRequest, NextResponse } from "next/server"
import { getMoMoFloatAccountsByBranch } from "@/lib/momo-database-service"

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
  try {
    const branchId = params.branchId
    const accounts = await getMoMoFloatAccountsByBranch(branchId)

    return NextResponse.json({
      success: true,
      accounts,
    })
  } catch (error) {
    console.error("Error fetching MoMo accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
