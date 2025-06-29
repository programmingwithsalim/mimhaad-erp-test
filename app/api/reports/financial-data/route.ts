import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get("type") || "all"
    const dateFrom = searchParams.get("from") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
    const dateTo = searchParams.get("to") || new Date().toISOString().split("T")[0]
    const branch = searchParams.get("branch") || "all"

    // Get GL account balances for the period
    const accountBalances = await sql`
      SELECT 
        ga.id,
        ga.code,
        ga.name,
        ga.type,
        COALESCE(gab.current_balance, 0) as current_balance
      FROM gl_accounts ga
      LEFT JOIN gl_account_balances gab ON ga.id = gab.account_id
      WHERE ga.is_active = true
      ORDER BY ga.code
    `

    // Get transactions for the period
    const transactions = await sql`
      SELECT 
        gt.id,
        gt.date,
        gt.source_module,
        gt.description,
        gte.account_id,
        gte.account_code,
        gte.debit,
        gte.credit,
        ga.type as account_type,
        ga.name as account_name
      FROM gl_transactions gt
      JOIN gl_transaction_entries gte ON gt.id = gte.transaction_id
      JOIN gl_accounts ga ON gte.account_id = ga.id
      WHERE gt.date >= ${dateFrom}
        AND gt.date <= ${dateTo}
        AND gt.status = 'posted'
      ORDER BY gt.date DESC
    `

    // Calculate Income Statement
    const revenue = {}
    const expenses = {}
    let totalRevenue = 0
    let totalExpenses = 0

    transactions.forEach((transaction) => {
      if (transaction.account_type === "Revenue") {
        const accountName = transaction.account_name.toLowerCase().replace(/\s+/g, "_")
        revenue[accountName] = (revenue[accountName] || 0) + Number(transaction.credit) - Number(transaction.debit)
        totalRevenue += Number(transaction.credit) - Number(transaction.debit)
      } else if (transaction.account_type === "Expense") {
        const accountName = transaction.account_name.toLowerCase().replace(/\s+/g, "_")
        expenses[accountName] = (expenses[accountName] || 0) + Number(transaction.debit) - Number(transaction.credit)
        totalExpenses += Number(transaction.debit) - Number(transaction.credit)
      }
    })

    revenue["total_revenue"] = totalRevenue
    expenses["total_expenses"] = totalExpenses

    // Calculate Balance Sheet
    const assets = { current_assets: {}, total_assets: 0 }
    const liabilities = { current_liabilities: {}, total_liabilities: 0 }
    const equity = { retained_earnings: 0, total_equity: 0 }

    accountBalances.forEach((account) => {
      const balance = Number(account.current_balance)
      const accountName = account.name.toLowerCase().replace(/\s+/g, "_")

      if (account.type === "Asset") {
        assets.current_assets[accountName] = balance
        assets.total_assets += balance
      } else if (account.type === "Liability") {
        liabilities.current_liabilities[accountName] = balance
        liabilities.total_liabilities += balance
      } else if (account.type === "Equity") {
        equity.retained_earnings += balance
        equity.total_equity += balance
      }
    })

    // Calculate Cash Flow (simplified)
    const operatingActivities = {
      net_income: totalRevenue - totalExpenses,
      net_cash_from_operations: totalRevenue - totalExpenses,
    }

    const investingActivities = {
      equipment_purchases: 0,
      net_cash_from_investing: 0,
    }

    const financingActivities = {
      owner_contributions: 0,
      net_cash_from_financing: 0,
    }

    const netCashFlow =
      operatingActivities.net_cash_from_operations +
      investingActivities.net_cash_from_investing +
      financingActivities.net_cash_from_financing

    const financialData = {
      income_statement: {
        period: `${dateFrom} to ${dateTo}`,
        revenue,
        expenses,
        net_income: totalRevenue - totalExpenses,
      },
      balance_sheet: {
        as_of: dateTo,
        assets,
        liabilities,
        equity,
      },
      cash_flow: {
        period: `${dateFrom} to ${dateTo}`,
        operating_activities: operatingActivities,
        investing_activities: investingActivities,
        financing_activities: financingActivities,
        net_cash_flow: netCashFlow,
      },
    }

    // Filter data based on report type
    let responseData = financialData
    if (reportType !== "all") {
      responseData = { [reportType]: financialData[reportType] }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      filters: {
        type: reportType,
        date_from: dateFrom,
        date_to: dateTo,
        branch: branch,
      },
      metadata: {
        total_transactions: transactions.length,
        total_accounts: accountBalances.length,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error generating financial reports from database:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate financial reports from database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
