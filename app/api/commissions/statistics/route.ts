import { type NextRequest, NextResponse } from "next/server"
import { getCommissionStatistics } from "@/lib/commission-database-service"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching commission statistics")

    // Get user info with proper error handling
    let userBranchId: string | undefined
    let canViewAllBranches = false

    try {
      // Try to get user from headers first (more reliable)
      userBranchId = request.headers.get("x-branch-id") || undefined
      const userRole = request.headers.get("x-user-role") || "user"
      canViewAllBranches = userRole === "admin" || userRole === "manager"

      console.log("User context from headers:", { userBranchId, canViewAllBranches, userRole })
    } catch (error) {
      console.log("Could not get user context, using defaults")
      // Default to showing all data for now
      canViewAllBranches = true
    }

    const statistics = await getCommissionStatistics(userBranchId, canViewAllBranches)

    console.log("Statistics fetched successfully:", statistics)
    return NextResponse.json(statistics)
  } catch (error) {
    console.error("Error fetching commission statistics:", error)

    // Always return JSON, never HTML
    return NextResponse.json(
      {
        error: "Failed to fetch commission statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
