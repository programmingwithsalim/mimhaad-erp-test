import { type NextRequest, NextResponse } from "next/server"
import { EnhancedDashboardService } from "@/lib/services/enhanced-dashboard-service"
import { DashboardServiceFallback } from "@/lib/services/dashboard-service-fallback"

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role") || "cashier"
    const branchId = request.headers.get("x-user-branch")
    const branchName = request.headers.get("x-user-branch-name")

    console.log("Enhanced dashboard request:", { userRole, branchId, branchName })

    let dashboardData

    try {
      // Try to get real data first
      dashboardData = await EnhancedDashboardService.getDashboardData(userRole, branchId, branchName)
    } catch (error) {
      console.error("Error fetching enhanced dashboard data, using fallback:", error)

      // Use fallback data if real data fails
      const fallbackData = await DashboardServiceFallback.getDashboardData(userRole, branchId)

      // Transform fallback data to enhanced format
      dashboardData = {
        userInfo: { role: userRole, branchId, branchName },
        totalStats: fallbackData.totalStats,
        serviceStats: fallbackData.serviceStats.map((service) => ({
          ...service,
          branchId: branchId || "all",
          branchName: branchName || "All Branches",
        })),
        recentTransactions: fallbackData.recentTransactions,
        branchComparisons: fallbackData.branchStats?.map((branch) => ({
          branchId: branch.id,
          branchName: branch.name,
          totalBalance: branch.total_balance,
          todayTransactions: 0,
          todayVolume: 0,
          todayFees: 0,
          weeklyGrowth: 0,
        })),
        financialMetrics: fallbackData.financialOverview
          ? {
              totalRevenue: 50000,
              totalExpenses: 18000,
              netIncome: fallbackData.financialOverview.netIncome,
              profitMargin: fallbackData.financialOverview.profitMargin,
              cashFlow: fallbackData.financialOverview.cashFlow,
              outstandingCommissions: 5000,
              pendingExpenses: 2000,
            }
          : undefined,
        alerts: [
          {
            type: "info" as const,
            message: "Using sample data - connect to database for real-time information",
            priority: "low" as const,
          },
        ],
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error("Enhanced dashboard API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch enhanced dashboard data",
      },
      { status: 500 },
    )
  }
}
