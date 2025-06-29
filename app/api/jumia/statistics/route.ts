import { type NextRequest, NextResponse } from "next/server"
import { getJumiaStatistics, getJumiaLiability } from "@/lib/jumia-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || "branch-1"

    console.log("GET statistics request - branchId:", branchId)

    const [statistics, liability] = await Promise.all([getJumiaStatistics(branchId), getJumiaLiability(branchId)])

    const result = {
      ...statistics,
      current_liability: liability,
    }

    console.log("Calculated statistics:", result)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error getting Jumia statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
