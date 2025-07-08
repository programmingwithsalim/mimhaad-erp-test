"use server";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const timeRange = searchParams.get("timeRange") || "7d";
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");
    const branch = searchParams.get("branch");

    // Calculate date range based on timeRange
    const endDate = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "1d":
        startDate.setDate(endDate.getDate() - 1);
        break;
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Role-based access control
    const isAdmin = userRole === "Admin";
    const effectiveBranchId = isAdmin ? branch : userBranchId;

    // Build branch filter for SQL queries
    const branchFilter =
      effectiveBranchId && effectiveBranchId !== "all"
        ? `AND branch_id = '${effectiveBranchId}'`
        : "";

    // Get comprehensive transaction metrics with aggregation
    const transactionMetricsQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(fee), 0) as total_fees,
        COALESCE(AVG(amount), 0) as avg_transaction_value,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT branch_id) as active_branches
      FROM (
        SELECT amount, fee, user_id, branch_id FROM agency_banking_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee, user_id, branch_id FROM momo_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee, user_id, branch_id FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee, user_id, branch_id FROM power_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee, user_id, branch_id FROM jumia_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'active' ${branchFilter}
      ) as all_transactions
    `;

    // Get revenue metrics with aggregation
    const revenueMetricsQuery = `
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commission_revenue,
        COALESCE(SUM(expense_amount), 0) as total_expenses,
        COALESCE(SUM(fee_revenue), 0) as total_fee_revenue
      FROM (
        SELECT 
          COALESCE(SUM(amount), 0) as commission_amount,
          0 as expense_amount,
          COALESCE(SUM(fee), 0) as fee_revenue
        FROM commissions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'paid' ${branchFilter}
        UNION ALL
        SELECT 
          0 as commission_amount,
          COALESCE(SUM(amount), 0) as expense_amount,
          0 as fee_revenue
        FROM expenses 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'paid' ${branchFilter}
      ) as revenue_data
    `;

    // Get service performance breakdown
    const servicePerformanceQuery = `
      SELECT 
        service_type,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(fee), 0) as total_fees,
        COALESCE(AVG(amount), 0) as avg_transaction_value
      FROM (
        SELECT 'agency_banking' as service_type, amount, fee FROM agency_banking_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'momo' as service_type, amount, fee FROM momo_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'e_zwich' as service_type, amount, fee FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'power' as service_type, amount, fee FROM power_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'jumia' as service_type, amount, fee FROM jumia_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'active' ${branchFilter}
      ) as service_data
      GROUP BY service_type
      ORDER BY total_volume DESC
    `;

    // Get branch performance
    const branchPerformanceQuery = `
      SELECT 
        b.id,
        b.name,
        b.location,
        COUNT(t.transaction_id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(SUM(t.fee), 0) as total_fees
      FROM branches b
      LEFT JOIN (
        SELECT branch_id, id as transaction_id, amount, fee FROM agency_banking_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM momo_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM power_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM jumia_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'active'
      ) t ON b.id = t.branch_id
      ${
        effectiveBranchId && effectiveBranchId !== "all"
          ? `WHERE b.id = '${effectiveBranchId}'`
          : ""
      }
      GROUP BY b.id, b.name, b.location
      ORDER BY total_volume DESC
    `;

    // Get time series data with daily aggregation
    const timeSeriesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM (
        SELECT created_at, amount, fee FROM agency_banking_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM momo_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM power_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM jumia_transactions 
        WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
        AND status = 'active' ${branchFilter}
      ) as all_transactions
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Get customer metrics
    const customerMetricsQuery = `
      SELECT 
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(*) as total_transactions,
        COUNT(DISTINCT CASE WHEN transaction_count > 1 THEN customer_name END) as repeat_customers
      FROM (
        SELECT 
          customer_name,
          COUNT(*) as transaction_count
        FROM (
          SELECT customer_name FROM agency_banking_transactions 
          WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
          AND status = 'completed' ${branchFilter}
          UNION ALL
          SELECT customer_name FROM momo_transactions 
          WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
          AND status = 'completed' ${branchFilter}
          UNION ALL
          SELECT customer_name FROM e_zwich_withdrawals 
          WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
          AND status = 'completed' ${branchFilter}
          UNION ALL
          SELECT customer_name FROM power_transactions 
          WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
          AND status = 'completed' ${branchFilter}
          UNION ALL
          SELECT customer_name FROM jumia_transactions 
          WHERE created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}' 
          AND status = 'active' ${branchFilter}
        ) as all_customers
        GROUP BY customer_name
      ) as customer_stats
    `;

    // Get float metrics
    const floatMetricsQuery = `
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(current_balance), 0) as total_balance,
        COALESCE(AVG(current_balance), 0) as average_balance,
        COUNT(CASE WHEN current_balance < min_threshold THEN 1 END) as low_balance_accounts,
        COALESCE(MIN(current_balance), 0) as min_balance,
        COALESCE(MAX(current_balance), 0) as max_balance
      FROM float_accounts 
      WHERE is_active = true ${branchFilter}
    `;

    // Execute all queries in parallel
    const [
      transactionMetricsResult,
      revenueMetricsResult,
      servicePerformanceResult,
      branchPerformanceResult,
      timeSeriesResult,
      customerMetricsResult,
      floatMetricsResult,
    ] = await Promise.all([
      sql.unsafe(transactionMetricsQuery),
      sql.unsafe(revenueMetricsQuery),
      sql.unsafe(servicePerformanceQuery),
      sql.unsafe(branchPerformanceQuery),
      sql.unsafe(timeSeriesQuery),
      sql.unsafe(customerMetricsQuery),
      sql.unsafe(floatMetricsQuery),
    ]);

    // Process results
    const transactionMetrics = {
      totalCount: Number(transactionMetricsResult[0]?.total_count || 0),
      totalVolume: Number(transactionMetricsResult[0]?.total_volume || 0),
      totalFees: Number(transactionMetricsResult[0]?.total_fees || 0),
      averageTransactionValue: Number(
        transactionMetricsResult[0]?.avg_transaction_value || 0
      ),
      uniqueUsers: Number(transactionMetricsResult[0]?.unique_users || 0),
      activeBranches: Number(transactionMetricsResult[0]?.active_branches || 0),
    };

    const revenueMetrics = {
      totalRevenue: Number(transactionMetrics.totalFees),
      commissionRevenue: Number(
        revenueMetricsResult[0]?.total_commission_revenue || 0
      ),
      feeRevenue: Number(revenueMetricsResult[0]?.total_fee_revenue || 0),
      totalExpenses: Number(revenueMetricsResult[0]?.total_expenses || 0),
      netRevenue:
        Number(transactionMetrics.totalFees) -
        Number(revenueMetricsResult[0]?.total_expenses || 0),
      profitMargin:
        Number(transactionMetrics.totalFees) > 0
          ? ((Number(transactionMetrics.totalFees) -
              Number(revenueMetricsResult[0]?.total_expenses || 0)) /
              Number(transactionMetrics.totalFees)) *
            100
          : 0,
    };

    const servicePerformance = Array.isArray(servicePerformanceResult)
      ? servicePerformanceResult.map((service: any) => ({
          service: service.service_type.replace("_", " ").toUpperCase(),
          transactionCount: Number(service.transaction_count || 0),
          totalVolume: Number(service.total_volume || 0),
          totalFees: Number(service.total_fees || 0),
          avgTransactionValue: Number(service.avg_transaction_value || 0),
        }))
      : [];

    const branchPerformance = Array.isArray(branchPerformanceResult)
      ? branchPerformanceResult.map((branch: any) => ({
          id: branch.id,
          name: branch.name,
          location: branch.location,
          total_transactions: Number(branch.total_transactions || 0),
          total_volume: Number(branch.total_volume || 0),
          total_fees: Number(branch.total_fees || 0),
        }))
      : [];

    const timeSeriesData = Array.isArray(timeSeriesResult)
      ? timeSeriesResult.map((row: any) => ({
          date: row.date,
          transactionCount: Number(row.transaction_count || 0),
          volume: Number(row.volume || 0),
          fees: Number(row.fees || 0),
        }))
      : [];

    const customerMetrics = {
      uniqueCustomers: Number(customerMetricsResult[0]?.unique_customers || 0),
      totalCustomers: Number(customerMetricsResult[0]?.unique_customers || 0),
      repeatCustomers: Number(customerMetricsResult[0]?.repeat_customers || 0),
      repeatCustomerRate:
        Number(customerMetricsResult[0]?.unique_customers || 0) > 0
          ? (Number(customerMetricsResult[0]?.repeat_customers || 0) /
              Number(customerMetricsResult[0]?.unique_customers || 0)) *
            100
          : 0,
      newCustomers:
        Number(customerMetricsResult[0]?.unique_customers || 0) -
        Number(customerMetricsResult[0]?.repeat_customers || 0),
    };

    const floatMetrics = {
      totalAccounts: Number(floatMetricsResult[0]?.total_accounts || 0),
      totalBalance: Number(floatMetricsResult[0]?.total_balance || 0),
      averageBalance: Number(floatMetricsResult[0]?.average_balance || 0),
      lowBalanceAccounts: Number(
        floatMetricsResult[0]?.low_balance_accounts || 0
      ),
      minBalance: Number(floatMetricsResult[0]?.min_balance || 0),
      maxBalance: Number(floatMetricsResult[0]?.max_balance || 0),
      utilizationRate:
        Number(floatMetricsResult[0]?.total_balance || 0) > 0
          ? (Number(floatMetricsResult[0]?.total_balance || 0) /
              (Number(floatMetricsResult[0]?.max_balance || 0) *
                Number(floatMetricsResult[0]?.total_accounts || 0))) *
            100
          : 0,
    };

    const summary = {
      totalTransactions: transactionMetrics.totalCount,
      totalRevenue: revenueMetrics.totalRevenue,
      averageTransactionValue: transactionMetrics.averageTransactionValue,
      topPerformingService:
        servicePerformance.length > 0 ? servicePerformance[0].service : "N/A",
      growthRate:
        timeSeriesData.length > 1
          ? ((timeSeriesData[timeSeriesData.length - 1].volume -
              timeSeriesData[0].volume) /
              timeSeriesData[0].volume) *
            100
          : 0,
    };

    const transactionStats = {
      totalTransactions: transactionMetrics.totalCount,
      totalVolume: transactionMetrics.totalVolume,
      averageTransaction: transactionMetrics.averageTransactionValue,
      successRate: 98.5, // This would need to be calculated from actual success/failure data
      dailyTrends: timeSeriesData.map((item) => ({
        date: item.date,
        transactions: item.transactionCount,
        volume: item.volume,
      })),
    };

    const revenueBreakdown = {
      totalRevenue: revenueMetrics.totalRevenue,
      byService: servicePerformance.reduce((acc, service) => {
        acc[service.service.toLowerCase()] = service.totalFees;
        return acc;
      }, {} as Record<string, number>),
      monthlyTrends: timeSeriesData.reduce((acc, item) => {
        const month = new Date(item.date).toLocaleString("default", {
          month: "short",
        });
        const existing = acc.find((m: any) => m.month === month);
        if (existing) {
          existing.revenue += item.fees;
        } else {
          acc.push({ month, revenue: item.fees });
        }
        return acc;
      }, [] as Array<{ month: string; revenue: number }>),
    };

    const userActivity = {
      activeUsers: transactionMetrics.uniqueUsers,
      topPerformers: [], // This would need a separate query for user performance
      branchActivity: branchPerformance.map((branch) => ({
        branch: branch.name,
        transactions: branch.total_transactions,
        volume: branch.total_volume,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        transactionMetrics,
        revenueMetrics,
        servicePerformance,
        branchPerformance,
        timeSeriesData,
        customerMetrics,
        floatMetrics,
        summary,
        transactionStats,
        revenueBreakdown,
        userActivity,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
