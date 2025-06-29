import { type NextRequest, NextResponse } from "next/server"
import { getMoMoStatistics } from "@/lib/momo-database-service"

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
  try {
    const branchId = params.branchId
    const statistics = await getMoMoStatistics(branchId)

    return NextResponse.json({
      success: true,
      statistics,
    })
  } catch (error) {
    console.error("Error fetching MoMo statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
