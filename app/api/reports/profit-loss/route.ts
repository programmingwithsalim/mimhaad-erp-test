import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branch = searchParams.get("branch");

    // Get user context for authorization
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (error) {
      console.warn("Authentication failed:", error);
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Determine effective branch filter
    const effectiveBranchId = user.role === "admin" ? branch : user.branchId;
    const branchFilter =
      effectiveBranchId && effectiveBranchId !== "all"
        ? sql`AND branch_id = ${effectiveBranchId}`
        : sql``;

    // Date filter
    const dateFilter =
      from && to ? sql`AND created_at::date BETWEEN ${from} AND ${to}` : sql``;

    // Get revenue breakdown by service
    const revenueBreakdown = await sql`
      WITH revenue_data AS (
        -- MoMo Revenue
        SELECT 
          'MoMo' as service,
          COALESCE(SUM(fee), 0) as revenue,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM momo_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Agency Banking Revenue
        SELECT 
          'Agency Banking' as service,
          COALESCE(SUM(fee), 0) as revenue,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM agency_banking_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- E-Zwich Revenue
        SELECT 
          'E-Zwich' as service,
          COALESCE(SUM(fee), 0) as revenue,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM e_zwich_withdrawals
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Power Revenue
        SELECT 
          'Power' as service,
          COALESCE(SUM(commission), 0) as revenue,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM power_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Jumia Revenue
        SELECT 
          'Jumia' as service,
          COALESCE(SUM(fee), 0) as revenue,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM jumia_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Commission Revenue
        SELECT 
          'Commissions' as service,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions,
          0 as volume
        FROM commissions
        WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
      )
      SELECT 
        service,
        revenue,
        transactions,
        volume,
        CASE 
          WHEN volume > 0 THEN (revenue / volume) * 100
          ELSE 0
        END as margin_percentage
      FROM revenue_data
      ORDER BY revenue DESC
    `;

    // Get expense breakdown by category
    const expenseBreakdown = await sql`
      SELECT 
        eh.category,
        COUNT(*) as count,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COALESCE(AVG(e.amount), 0) as avg_amount
      FROM expenses e
      LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
      WHERE e.status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
      GROUP BY eh.category
      ORDER BY total_amount DESC
    `;

    // Get expense breakdown by expense head
    const expenseHeadBreakdown = await sql`
      SELECT 
        eh.name as expense_head,
        eh.category,
        COUNT(*) as count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM expenses e
      LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
      WHERE e.status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
      GROUP BY eh.id, eh.name, eh.category
      ORDER BY total_amount DESC
    `;

    // Calculate totals
    const totalRevenue = revenueBreakdown.reduce(
      (sum, item) => sum + Number(item.revenue || 0),
      0
    );
    const totalExpenses = expenseBreakdown.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Get monthly trend
    const monthlyTrend = await sql`
      WITH monthly_revenue AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(fee), 0) as revenue
        FROM momo_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(fee), 0) as revenue
        FROM agency_banking_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(fee), 0) as revenue
        FROM e_zwich_withdrawals
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(commission), 0) as revenue
        FROM power_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(fee), 0) as revenue
        FROM jumia_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
        
        UNION ALL
        
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM commissions
        WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      monthly_expenses AS (
        SELECT 
          DATE_TRUNC('month', expense_date) as month,
          COALESCE(SUM(amount), 0) as expenses
        FROM expenses
        WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
        GROUP BY DATE_TRUNC('month', expense_date)
      )
      SELECT 
        mr.month,
        COALESCE(SUM(mr.revenue), 0) as revenue,
        COALESCE(me.expenses, 0) as expenses,
        COALESCE(SUM(mr.revenue), 0) - COALESCE(me.expenses, 0) as profit
      FROM monthly_revenue mr
      LEFT JOIN monthly_expenses me ON mr.month = me.month
      GROUP BY mr.month, me.expenses
      ORDER BY mr.month DESC
      LIMIT 12
    `;

    // Get top performing services
    const topServices = revenueBreakdown
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))
      .slice(0, 5);

    // Get top expense categories
    const topExpenses = expenseBreakdown
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          grossProfit,
          profitMargin,
          totalTransactions: revenueBreakdown.reduce(
            (sum, item) => sum + Number(item.transactions || 0),
            0
          ),
          totalVolume: revenueBreakdown.reduce(
            (sum, item) => sum + Number(item.volume || 0),
            0
          ),
        },
        revenueBreakdown,
        expenseBreakdown,
        expenseHeadBreakdown,
        monthlyTrend,
        topServices,
        topExpenses,
        reportDate: new Date().toISOString(),
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating profit & loss report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate profit & loss report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
