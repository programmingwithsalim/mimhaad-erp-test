import { type NextRequest, NextResponse } from "next/server";
import { EnhancedDashboardService } from "@/lib/services/enhanced-dashboard-service";
import { DashboardServiceFallback } from "@/lib/services/dashboard-service-fallback";

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role") || "cashier";
    const branchId = request.headers.get("x-user-branch") || undefined;
    const branchName = request.headers.get("x-user-branch-name") || undefined;

    console.log("Enhanced dashboard request:", {
      userRole,
      branchId,
      branchName,
    });

    let dashboardData;

    try {
      // Try to get real data first
      dashboardData = await EnhancedDashboardService.getDashboardData(
        userRole,
        branchId,
        branchName
      );
    } catch (error) {
      console.error(
        "Error fetching enhanced dashboard data, using fallback:",
        error
      );

      // Use fallback data if real data fails
      const fallbackData = await DashboardServiceFallback.getDashboardData(
        userRole,
        branchId
      );

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
            message:
              "Using sample data - connect to database for real-time information",
            priority: "low" as const,
          },
        ],
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        // Transform enhanced data to match DashboardStats interface
        totalTransactions: dashboardData.totalStats?.totalTransactions || 0,
        totalVolume: dashboardData.totalStats?.totalRevenue || 0,
        totalCommission: dashboardData.totalStats?.totalFees || 0,
        activeUsers: 0, // Not available in enhanced data
        todayTransactions:
          dashboardData.serviceStats?.reduce(
            (sum, service) => sum + service.todayTransactions,
            0
          ) || 0,
        todayVolume:
          dashboardData.serviceStats?.reduce(
            (sum, service) => sum + service.todayVolume,
            0
          ) || 0,
        todayCommission:
          dashboardData.serviceStats?.reduce(
            (sum, service) => sum + service.todayFees,
            0
          ) || 0,
        serviceBreakdown:
          dashboardData.serviceStats?.map((service) => ({
            service: service.service,
            transactions: service.todayTransactions,
            volume: service.todayVolume,
            commission: service.todayFees,
          })) || [],
        recentActivity:
          dashboardData.recentTransactions?.slice(0, 10).map((tx) => ({
            id: tx.id || tx.transaction_id || "",
            type: tx.type || "transaction",
            service: tx.service || tx.service_type || "unknown",
            amount: tx.amount || 0,
            timestamp:
              tx.created_at || tx.timestamp || new Date().toISOString(),
            user: tx.user_name || tx.user || "Unknown",
          })) || [],
        floatAlerts:
          dashboardData.alerts
            ?.filter(
              (alert) => alert.type === "warning" || alert.type === "error"
            )
            .map((alert) => ({
              id: Math.random().toString(),
              provider: alert.message?.includes("float")
                ? "Float Account"
                : "System",
              service: alert.message?.includes("momo")
                ? "MoMo"
                : alert.message?.includes("power")
                ? "Power"
                : alert.message?.includes("ezwich")
                ? "E-Zwich"
                : "General",
              current_balance: alert.message?.includes("low") ? 500 : 1000,
              threshold: alert.message?.includes("low") ? 1000 : 2000,
              severity: alert.type === "error" ? "critical" : "warning",
            })) || [],
        chartData: [
          {
            date: "2024-01-01",
            transactions: 45,
            volume: 16200,
            commission: 810,
          },
          {
            date: "2024-01-02",
            transactions: 52,
            volume: 18720,
            commission: 936,
          },
          {
            date: "2024-01-03",
            transactions: 48,
            volume: 17280,
            commission: 864,
          },
          {
            date: "2024-01-04",
            transactions: 61,
            volume: 21960,
            commission: 1098,
          },
          {
            date: "2024-01-05",
            transactions: 55,
            volume: 19800,
            commission: 990,
          },
          {
            date: "2024-01-06",
            transactions: 42,
            volume: 15120,
            commission: 756,
          },
          {
            date: "2024-01-07",
            transactions: 38,
            volume: 13680,
            commission: 684,
          },
        ],
      },
    });
  } catch (error) {
    console.error("Enhanced dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch enhanced dashboard data",
      },
      { status: 500 }
    );
  }
}
