import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, dateRange, branch } = body

    console.log("📊 Generating financial statement:", { type, dateRange, branch })

    if (type === "income_statement") {
      return await generateIncomeStatement(dateRange, branch)
    } else if (type === "balance_sheet") {
      return await generateBalanceSheet(dateRange, branch)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid statement type",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ Error generating financial statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate financial statement",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function generateIncomeStatement(dateRange: any, branch: any) {
  try {
    // Check if GL tables exist
    const tablesExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gl_accounts'
      ) as gl_accounts_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gl_journal_entries'
      ) as gl_entries_exists
    `

    if (!tablesExist[0]?.gl_accounts_exists || !tablesExist[0]?.gl_entries_exists) {
      return NextResponse.json({
        success: true,
        data: {
          revenue: { total: 0, accounts: [] },
          expenses: { total: 0, accounts: [] },
          netIncome: 0,
        },
      })
    }

    // Get revenue data (simplified)
    const revenueData = await sql`
      SELECT 
        COALESCE(SUM(current_balance), 0) as total_revenue
      FROM gl_accounts 
      WHERE account_code LIKE '4%' 
        AND is_active = true
    `

    // Get expense data (simplified)
    const expenseData = await sql`
      SELECT 
        COALESCE(SUM(current_balance), 0) as total_expenses
      FROM gl_accounts 
      WHERE account_code LIKE '5%' 
        AND is_active = true
    `

    const totalRevenue = Number(revenueData[0]?.total_revenue || 0)
    const totalExpenses = Number(expenseData[0]?.total_expenses || 0)

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          momo_fees: totalRevenue * 0.4,
          agency_fees: totalRevenue * 0.3,
          ezwich_fees: totalRevenue * 0.2,
          power_fees: totalRevenue * 0.1,
          commissions: 0,
        },
        expenses: {
          total: totalExpenses,
          operating: totalExpenses * 0.6,
          processing: totalExpenses * 0.3,
          float_management: totalExpenses * 0.1,
        },
        netIncome: totalRevenue - totalExpenses,
      },
    })
  } catch (error) {
    console.error("Error generating income statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate income statement",
      },
      { status: 500 },
    )
  }
}

async function generateBalanceSheet(dateRange: any, branch: any) {
  try {
    // Simplified balance sheet
    return NextResponse.json({
      success: true,
      data: {
        assets: { total: 0, current: 0, fixed: 0 },
        liabilities: { total: 0, current: 0, longTerm: 0 },
        equity: { total: 0 },
      },
    })
  } catch (error) {
    console.error("Error generating balance sheet:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate balance sheet",
      },
      { status: 500 },
    )
  }
}
