"use server";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");
    const branch = searchParams.get("branch");

    // Role-based access control
    const isAdmin = userRole === "Admin";
    const isFinance = userRole === "Finance";
    const isManager = userRole === "Manager";
    const isOperations = userRole === "Operations";
    const isCashier = userRole === "Cashier";

    // Determine effective branch filter
    const effectiveBranchId = isAdmin ? branch : userBranchId;

    // Build branch filter for SQL queries - handle both UUID and varchar branch_id columns
    const branchFilter =
      effectiveBranchId && effectiveBranchId !== "all"
        ? `AND branch_id::uuid = '${effectiveBranchId}'::uuid`
        : "";

    // Get revenue data from all transaction sources
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN fee > 0 THEN fee ELSE 0 END), 0) as total_fees
      FROM (
        SELECT amount, fee FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      ) as all_transactions
    `;

    // Get expense data
    const expenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
    `;

    // Get cash position from float accounts
    const cashQuery = `
      SELECT COALESCE(SUM(balance), 0) as cash_position
      FROM float_accounts 
      WHERE is_active = true ${branchFilter}
    `;

    // Get service breakdown
    const serviceBreakdownQuery = `
      SELECT 
        'momo' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM momo_transactions 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'agency_banking' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM agency_banking_transactions 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'ezwich' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM e_zwich_withdrawals 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'power' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM power_transactions 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'jumia' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM jumia_transactions 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
    `;

    // Get time series data
    const timeSeriesQuery = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(fee), 0) as fees
      FROM (
        SELECT created_at, amount, fee FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      ) as all_transactions
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Execute queries
    const [
      revenueResult,
      expenseResult,
      cashResult,
      serviceResult,
      timeSeriesResult,
    ] = await Promise.all([
      sql.unsafe(revenueQuery),
      sql.unsafe(expenseQuery),
      sql.unsafe(cashQuery),
      sql.unsafe(serviceBreakdownQuery),
      sql.unsafe(timeSeriesQuery),
    ]);

    // Debug information
    console.log("Reports API Debug:", {
      from,
      to,
      userRole,
      userBranchId,
      branch,
      effectiveBranchId,
      branchFilter,
      revenueResult: revenueResult,
      expenseResult: expenseResult,
      serviceResult: serviceResult,
    });

    // Process results
    const totalRevenue = Number(
      (revenueResult as unknown as any[])[0]?.total_revenue || 0
    );
    const totalFees = Number(
      (revenueResult as unknown as any[])[0]?.total_fees || 0
    );
    const totalExpenses = Number(
      (expenseResult as unknown as any[])[0]?.total_expenses || 0
    );
    const cashPosition = Number(
      (cashResult as unknown as any[])[0]?.cash_position || 0
    );
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Process service breakdown
    const services = Array.isArray(serviceResult)
      ? serviceResult
          .filter((service: any) => Number(service.transactions) > 0)
          .map((service: any) => ({
            service: service.service.replace("_", " ").toUpperCase(),
            transactions: Number(service.transactions || 0),
            volume: Number(service.volume || 0),
            fees: Number(service.fees || 0),
          }))
          .sort((a: any, b: any) => b.volume - a.volume)
      : [];

    // Process time series data
    const timeSeries = Array.isArray(timeSeriesResult)
      ? timeSeriesResult.map((row: any) => ({
          date: row.date,
          revenue: Number(row.revenue || 0),
          expenses: 0, // We'll need to join with expenses table for this
        }))
      : [];

    // Calculate changes (simplified - you can enhance this with actual previous period data)
    const revenueChange = 0; // Will be calculated when we have historical data
    const expenseChange = 0; // Will be calculated when we have historical data

    const summary = {
      totalRevenue,
      totalExpenses,
      netIncome,
      cashPosition,
      profitMargin,
      revenueChange,
      expenseChange,
    };

    // Role-specific data
    const responseData: any = {
      summary,
      services,
      timeSeries,
      lastUpdated: new Date().toISOString(),
      hasData: totalRevenue > 0 || totalExpenses > 0 || services.length > 0,
    };

    // Add role-specific data
    if (isAdmin || isFinance) {
      const totalTransactions = services.reduce(
        (sum: number, s: any) => sum + s.transactions,
        0
      );
      responseData.financialMetrics = {
        totalFees,
        averageTransactionValue:
          totalRevenue > 0 && totalTransactions > 0
            ? totalRevenue / totalTransactions
            : 0,
        transactionCount: totalTransactions,
      };
    }

    if (isAdmin || isManager) {
      const totalRevenueSum = timeSeries.reduce(
        (sum: number, t: any) => sum + t.revenue,
        0
      );
      responseData.operationalMetrics = {
        activeServices: services.length,
        topPerformingService:
          services.length > 0 ? services[0].service : "None",
        averageDailyRevenue:
          timeSeries.length > 0 ? totalRevenueSum / timeSeries.length : 0,
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error generating comprehensive report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
