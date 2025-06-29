import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const branchId = searchParams.get("branchId")
    const type = searchParams.get("type") || "summary"

    if (!from || !to) {
      return NextResponse.json({ error: "Date range is required" }, { status: 400 })
    }

    // Transaction Summary
    const transactionSummary = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(AVG(amount), 0) as average_transaction
      FROM (
        SELECT amount, created_at FROM momo_transactions WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
        UNION ALL
        SELECT amount, created_at FROM agency_banking_transactions WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
        UNION ALL
        SELECT amount, created_at FROM power_transactions WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
        UNION ALL
        SELECT amount, created_at FROM jumia_transactions WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
      ) all_transactions
    `

    // Financial Summary
    const financialSummary = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM (
        SELECT amount, 'revenue' as type FROM commissions WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
        UNION ALL
        SELECT amount, 'expense' as type FROM expenses WHERE created_at BETWEEN ${from} AND ${to}
        ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
      ) financial_data
    `

    // Service Breakdown - handle missing fee columns gracefully
    const serviceBreakdown = await sql`
      SELECT 
        'Mobile Money' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='momo_transactions' AND column_name='fee') 
            THEN fee 
            WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='momo_transactions' AND column_name='fee_amount') 
            THEN fee_amount 
            ELSE 0 
          END
        ), 0) as revenue
      FROM momo_transactions 
      WHERE created_at BETWEEN ${from} AND ${to}
      ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
      
      UNION ALL
      
      SELECT 
        'Agency Banking' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='agency_banking_transactions' AND column_name='fee') 
            THEN fee 
            ELSE 0 
          END
        ), 0) as revenue
      FROM agency_banking_transactions 
      WHERE created_at BETWEEN ${from} AND ${to}
      ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
      
      UNION ALL
      
      SELECT 
        'Power/Utilities' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='power_transactions' AND column_name='fee') 
            THEN fee 
            ELSE 0 
          END
        ), 0) as revenue
      FROM power_transactions 
      WHERE created_at BETWEEN ${from} AND ${to}
      ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
      
      UNION ALL
      
      SELECT 
        'Jumia Pay' as service,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(
          CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='jumia_transactions' AND column_name='fee') 
            THEN fee 
            ELSE 0 
          END
        ), 0) as revenue
      FROM jumia_transactions 
      WHERE created_at BETWEEN ${from} AND ${to}
      ${branchId && branchId !== "all" ? sql`AND branch_id = ${branchId}` : sql``}
    `

    // Branch Performance (if not filtering by specific branch)
    let branchPerformance = []
    if (!branchId || branchId === "all") {
      branchPerformance = await sql`
        SELECT 
          branch_name,
          COUNT(*) as transactions,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(expenses), 0) as expenses
        FROM (
          SELECT branch_name, amount as revenue, 0 as expenses FROM commissions WHERE created_at BETWEEN ${from} AND ${to}
          UNION ALL
          SELECT branch_name, 0 as revenue, amount as expenses FROM expenses WHERE created_at BETWEEN ${from} AND ${to}
        ) branch_data
        GROUP BY branch_name
        ORDER BY revenue DESC
      `
    }

    const txSummary = transactionSummary[0] || {}
    const finSummary = financialSummary[0] || {}

    const totalRevenue = Number(finSummary.total_revenue) || 0
    const totalExpenses = Number(finSummary.total_expenses) || 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Find top service
    const topService = serviceBreakdown.reduce(
      (prev, current) => (Number(current.revenue) > Number(prev.revenue) ? current : prev),
      serviceBreakdown[0] || { service: "N/A" },
    )

    const reportData = {
      transactionSummary: {
        totalTransactions: Number(txSummary.total_transactions) || 0,
        totalVolume: Number(txSummary.total_volume) || 0,
        averageTransaction: Number(txSummary.average_transaction) || 0,
        topService: topService.service || "N/A",
      },
      financialSummary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
      },
      branchPerformance: branchPerformance.map((branch) => ({
        branchName: branch.branch_name,
        transactions: Number(branch.transactions),
        revenue: Number(branch.revenue),
        expenses: Number(branch.expenses),
      })),
      serviceBreakdown: serviceBreakdown.map((service) => ({
        service: service.service,
        transactions: Number(service.transactions),
        volume: Number(service.volume),
        revenue: Number(service.revenue),
      })),
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating comprehensive report:", error)
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
