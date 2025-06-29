import { type NextRequest, NextResponse } from "next/server"
import { getPowerStatistics } from "@/lib/power-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || undefined

    console.log("GET power statistics request - branchId:", branchId)

    const statistics = await getPowerStatistics(branchId)

    console.log("Calculated power statistics:", statistics)

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    console.error("Error getting power statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get power statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
