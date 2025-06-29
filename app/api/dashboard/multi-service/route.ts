import { type NextRequest, NextResponse } from "next/server"
import { DashboardService } from "@/lib/services/dashboard-service"
import { DashboardServiceFallback } from "@/lib/services/dashboard-service-fallback"

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers or session
    const userRole = request.headers.get("x-user-role") || "admin"
    const branchId = request.headers.get("x-user-branch") || undefined

    console.log("Dashboard API called with role:", userRole, "branch:", branchId)

    let dashboardData
    try {
      // Try to get real data first
      dashboardData = await DashboardService.getDashboardData(userRole, branchId)
    } catch (error) {
      console.log("Main dashboard service failed, using fallback:", error)
      // Fall back to mock data if real data fails
      dashboardData = await DashboardServiceFallback.getDashboardData(userRole, branchId)
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
