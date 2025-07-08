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

    // Get comprehensive revenue data with aggregation
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN fee > 0 THEN fee ELSE 0 END), 0) as total_fees,
        COUNT(*) as total_transactions,
        COALESCE(AVG(amount), 0) as avg_transaction_value
      FROM (
        SELECT amount, fee FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT amount, fee FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'active' ${branchFilter}
      ) as all_transactions
    `;

    // Get expense data with aggregation
    const expenseQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COUNT(*) as expense_count,
        COALESCE(AVG(amount), 0) as avg_expense,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_expenses
      FROM expenses 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
    `;

    // Get commission data with aggregation
    const commissionQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_commissions,
        COUNT(*) as commission_count,
        COALESCE(AVG(amount), 0) as avg_commission,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_commissions,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_commissions,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions
      FROM commissions 
      WHERE created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
    `;

    // Get cash position from float accounts with aggregation
    const cashQuery = `
      SELECT 
        COALESCE(SUM(current_balance), 0) as cash_position,
        COUNT(*) as total_accounts,
        COALESCE(AVG(current_balance), 0) as avg_balance,
        COUNT(CASE WHEN current_balance < min_threshold THEN 1 END) as low_balance_accounts,
        COUNT(CASE WHEN current_balance > max_threshold THEN 1 END) as high_balance_accounts
      FROM float_accounts 
      WHERE is_active = true ${branchFilter}
    `;

    // Get service breakdown with detailed aggregation
    const serviceBreakdownQuery = `
      SELECT 
        service_name,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees,
        COALESCE(AVG(amount), 0) as avg_transaction_value,
        COUNT(DISTINCT customer_name) as unique_customers
      FROM (
        SELECT 'MOMO' as service_name, amount, fee, customer_name FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'AGENCY BANKING' as service_name, amount, fee, customer_name FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'E-ZWICH' as service_name, amount, fee, customer_name FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'POWER' as service_name, amount, fee, customer_name FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT 'JUMIA' as service_name, amount, fee, customer_name FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'active' ${branchFilter}
      ) as service_data
      GROUP BY service_name
      ORDER BY volume DESC
    `;

    // Get time series data with daily aggregation
    const timeSeriesQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(SUM(fee), 0) as fees,
        COUNT(DISTINCT customer_name) as unique_customers
      FROM (
        SELECT created_at, amount, fee, customer_name FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee, customer_name FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee, customer_name FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee, customer_name FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount, fee, customer_name FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'active' ${branchFilter}
      ) as all_transactions
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Get expense breakdown by category
    const expenseBreakdownQuery = `
      SELECT 
        eh.name as expense_category,
        COUNT(e.id) as expense_count,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COALESCE(AVG(e.amount), 0) as avg_amount
      FROM expenses e
      LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
      WHERE e.created_at::date BETWEEN '${from}' AND '${to}' ${branchFilter}
      GROUP BY eh.name, eh.id
      ORDER BY total_amount DESC
    `;

    // Get branch performance comparison
    const branchPerformanceQuery = `
      SELECT 
        b.name as branch_name,
        b.location,
        COUNT(t.transaction_id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(SUM(t.fee), 0) as total_fees,
        COALESCE(AVG(t.amount), 0) as avg_transaction_value
      FROM branches b
      LEFT JOIN (
        SELECT branch_id, id as transaction_id, amount, fee FROM agency_banking_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM momo_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM e_zwich_withdrawals 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM power_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
        AND status = 'completed'
        UNION ALL
        SELECT branch_id, id as transaction_id, amount, fee FROM jumia_transactions 
        WHERE created_at::date BETWEEN '${from}' AND '${to}' 
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

    // Execute all queries in parallel
    const [
      revenueResult,
      expenseResult,
      commissionResult,
      cashResult,
      serviceResult,
      timeSeriesResult,
      expenseBreakdownResult,
      branchPerformanceResult,
    ] = await Promise.all([
      sql.unsafe(revenueQuery),
      sql.unsafe(expenseQuery),
      sql.unsafe(commissionQuery),
      sql.unsafe(cashQuery),
      sql.unsafe(serviceBreakdownQuery),
      sql.unsafe(timeSeriesQuery),
      sql.unsafe(expenseBreakdownQuery),
      sql.unsafe(branchPerformanceQuery),
    ]);

    // Process results
    const totalRevenue = Number(revenueResult[0]?.total_revenue || 0);
    const totalFees = Number(revenueResult[0]?.total_fees || 0);
    const totalTransactions = Number(revenueResult[0]?.total_transactions || 0);
    const avgTransactionValue = Number(
      revenueResult[0]?.avg_transaction_value || 0
    );

    const totalExpenses = Number(expenseResult[0]?.total_expenses || 0);
    const expenseCount = Number(expenseResult[0]?.expense_count || 0);
    const pendingExpenses = Number(expenseResult[0]?.pending_expenses || 0);
    const approvedExpenses = Number(expenseResult[0]?.approved_expenses || 0);
    const paidExpenses = Number(expenseResult[0]?.paid_expenses || 0);

    const totalCommissions = Number(
      commissionResult[0]?.total_commissions || 0
    );
    const commissionCount = Number(commissionResult[0]?.commission_count || 0);
    const pendingCommissions = Number(
      commissionResult[0]?.pending_commissions || 0
    );
    const approvedCommissions = Number(
      commissionResult[0]?.approved_commissions || 0
    );
    const paidCommissions = Number(commissionResult[0]?.paid_commissions || 0);

    const cashPosition = Number(cashResult[0]?.cash_position || 0);
    const totalAccounts = Number(cashResult[0]?.total_accounts || 0);
    const lowBalanceAccounts = Number(cashResult[0]?.low_balance_accounts || 0);

    const netIncome = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Calculate revenue and expense changes (would need previous period data for actual comparison)
    const revenueChange = 0; // Placeholder - would need previous period comparison
    const expenseChange = 0; // Placeholder - would need previous period comparison

    // Process service breakdown
    const services = Array.isArray(serviceResult)
      ? serviceResult
          .filter((service: any) => Number(service.transactions) > 0)
          .map((service: any) => ({
            service: service.service_name,
            transactions: Number(service.transactions || 0),
            volume: Number(service.volume || 0),
            fees: Number(service.fees || 0),
            avgTransactionValue: Number(service.avg_transaction_value || 0),
            uniqueCustomers: Number(service.unique_customers || 0),
          }))
          .sort((a: any, b: any) => b.volume - a.volume)
      : [];

    // Process time series data
    const timeSeries = Array.isArray(timeSeriesResult)
      ? timeSeriesResult.map((row: any) => ({
          date: row.date,
          revenue: Number(row.revenue || 0),
          expenses: 0, // Would need to join with expense data for daily expenses
          fees: Number(row.fees || 0),
          transactions: Number(row.transaction_count || 0),
          uniqueCustomers: Number(row.unique_customers || 0),
        }))
      : [];

    // Process expense breakdown
    const expenseBreakdown = Array.isArray(expenseBreakdownResult)
      ? expenseBreakdownResult
          .filter((expense: any) => Number(expense.total_amount) > 0)
          .map((expense: any) => ({
            category: expense.expense_category || "Uncategorized",
            count: Number(expense.expense_count || 0),
            amount: Number(expense.total_amount || 0),
            avgAmount: Number(expense.avg_amount || 0),
          }))
          .sort((a: any, b: any) => b.amount - a.amount)
      : [];

    // Process branch performance
    const branchPerformance = Array.isArray(branchPerformanceResult)
      ? branchPerformanceResult
          .filter((branch: any) => Number(branch.total_transactions) > 0)
          .map((branch: any) => ({
            name: branch.branch_name,
            location: branch.location,
            transactions: Number(branch.total_transactions || 0),
            volume: Number(branch.total_volume || 0),
            fees: Number(branch.total_fees || 0),
            avgTransactionValue: Number(branch.avg_transaction_value || 0),
          }))
          .sort((a: any, b: any) => b.volume - a.volume)
      : [];

    const summary = {
      totalRevenue,
      totalExpenses,
      netIncome,
      cashPosition,
      profitMargin,
      revenueChange,
      expenseChange,
      totalTransactions,
      avgTransactionValue,
      totalCommissions,
      totalFees,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        services,
        timeSeries,
        expenseBreakdown,
        branchPerformance,
        financialMetrics: {
          totalRevenue,
          totalExpenses,
          netIncome,
          profitMargin,
          cashPosition,
          totalAccounts,
          lowBalanceAccounts,
        },
        expenseMetrics: {
          totalExpenses,
          expenseCount,
          pendingExpenses,
          approvedExpenses,
          paidExpenses,
          avgExpense: expenseCount > 0 ? totalExpenses / expenseCount : 0,
        },
        commissionMetrics: {
          totalCommissions,
          commissionCount,
          pendingCommissions,
          approvedCommissions,
          paidCommissions,
          avgCommission:
            commissionCount > 0 ? totalCommissions / commissionCount : 0,
        },
        lastUpdated: new Date().toISOString(),
        hasData: totalTransactions > 0 || totalExpenses > 0,
      },
    });
  } catch (error) {
    console.error("Error fetching report data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch report data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
