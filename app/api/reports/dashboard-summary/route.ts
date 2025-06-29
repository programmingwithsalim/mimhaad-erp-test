import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0]
    const branch = searchParams.get("branch") || "all"

    // Build branch filter
    let branchFilter = ""
    if (branch !== "all") {
      branchFilter = `AND branch_id = '${branch}'`
    }

    // Get revenue data from various sources
    const revenueQuery = sql`
      SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_revenue
      FROM (
        SELECT amount FROM momo_transactions 
        WHERE created_at BETWEEN ${from} AND ${to} ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
        UNION ALL
        SELECT amount FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN ${from} AND ${to} ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
        UNION ALL
        SELECT amount FROM power_transactions 
        WHERE created_at BETWEEN ${from} AND ${to} ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
        UNION ALL
        SELECT amount FROM jumia_transactions 
        WHERE created_at BETWEEN ${from} AND ${to} ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
      ) as all_transactions
    `

    // Get expense data
    const expenseQuery = sql`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses 
      WHERE created_at BETWEEN ${from} AND ${to} ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
    `

    // Get cash position from float accounts
    const cashQuery = sql`
      SELECT COALESCE(SUM(current_balance), 0) as cash_position
      FROM float_accounts 
      WHERE is_active = true ${branchFilter ? sql`AND branch_id = ${branch}` : sql``}
    `

    // Execute queries
    const [revenueResult, expenseResult, cashResult] = await Promise.all([revenueQuery, expenseQuery, cashQuery])

    const totalRevenue = Number(revenueResult[0]?.total_revenue || 0)
    const totalExpenses = Number(expenseResult[0]?.total_expenses || 0)
    const cashPosition = Number(cashResult[0]?.cash_position || 0)
    const netIncome = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

    // Calculate changes (simplified - you can enhance this with actual previous period data)
    const revenueChange = 5.2 // Placeholder - implement actual calculation
    const expenseChange = 3.1 // Placeholder - implement actual calculation

    const summary = {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,
      cash_position: cashPosition,
      profit_margin: profitMargin,
      revenue_change: revenueChange,
      expense_change: expenseChange,
    }

    const syncStatus = {
      is_synced: true,
      last_sync: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        sync_status: syncStatus,
      },
    })
  } catch (error) {
    console.error("Error generating dashboard summary:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate dashboard summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
