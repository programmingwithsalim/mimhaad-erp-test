import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from =
      searchParams.get("from") ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0]
    const branch = searchParams.get("branch") || "all"

    // Get float account balances by type
    const floatBalances = await sql`
      SELECT 
        fa.account_type,
        fa.provider,
        SUM(fa.current_balance) as total_balance
      FROM float_accounts fa
      WHERE fa.is_active = true
      ${branch !== "all" ? sql`AND fa.branch_id = ${branch}` : sql``}
      GROUP BY fa.account_type, fa.provider
    `

    // Get GL account balances
    const glBalances = await sql`
      SELECT 
        gl.code,
        gl.name,
        gl.type,
        gl.balance
      FROM gl_accounts gl
      WHERE gl.is_active = true
      ORDER BY gl.code
    `

    // Calculate revenue from transactions (mock data for now)
    const revenue = {
      momo_revenue:
        floatBalances
          .filter((f) => f.account_type === "momo")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0) * 0.02, // 2% commission
      agency_banking_revenue:
        floatBalances
          .filter((f) => f.account_type === "agency-banking")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0) * 0.015, // 1.5% commission
      power_revenue:
        floatBalances
          .filter((f) => f.account_type === "power")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0) * 0.01, // 1% commission
      ezwich_revenue:
        floatBalances
          .filter((f) => f.account_type === "e-zwich")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0) * 0.005, // 0.5% commission
      jumia_revenue:
        floatBalances
          .filter((f) => f.account_type === "jumia")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0) * 0.025, // 2.5% commission
    }

    revenue.total_revenue = Object.values(revenue).reduce((sum, val) => sum + val, 0)

    // Calculate expenses (mock data)
    const expenses = {
      operational_expenses: revenue.total_revenue * 0.3,
      commission_expenses: revenue.total_revenue * 0.4,
      administrative_expenses: revenue.total_revenue * 0.1,
    }

    expenses.total_expenses = Object.values(expenses).reduce((sum, val) => sum + val, 0)

    // Calculate assets from float balances
    const assets = {
      current_assets: {
        cash_in_till: floatBalances
          .filter((f) => f.account_type === "cash-in-till")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0),
        momo_float: floatBalances
          .filter((f) => f.account_type === "momo")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0),
        agency_banking_float: floatBalances
          .filter((f) => f.account_type === "agency-banking")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0),
        power_float: floatBalances
          .filter((f) => f.account_type === "power")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0),
        ezwich_float: floatBalances
          .filter((f) => f.account_type === "e-zwich")
          .reduce((sum, f) => sum + Number.parseFloat(f.total_balance), 0),
      },
    }

    assets.current_assets.total_current_assets = Object.values(assets.current_assets).reduce((sum, val) => sum + val, 0)
    assets.total_assets = assets.current_assets.total_current_assets

    const financialData = {
      income_statement: {
        period: `${from} to ${to}`,
        revenue,
        expenses,
        net_income: revenue.total_revenue - expenses.total_expenses,
      },
      balance_sheet: {
        as_of: to,
        assets,
        liabilities: {
          current_liabilities: {
            customer_deposits: assets.total_assets * 0.1,
            merchant_payables: assets.total_assets * 0.05,
            commission_payables: revenue.total_revenue * 0.1,
            total_current_liabilities: assets.total_assets * 0.15,
          },
          total_liabilities: assets.total_assets * 0.15,
        },
        equity: {
          retained_earnings: assets.total_assets * 0.85,
          total_equity: assets.total_assets * 0.85,
        },
      },
      cash_flow: {
        period: `${from} to ${to}`,
        operating_activities: {
          net_income: revenue.total_revenue - expenses.total_expenses,
          float_changes: assets.total_assets * 0.1,
          commission_adjustments: revenue.total_revenue * 0.05,
          net_cash_from_operations: revenue.total_revenue - expenses.total_expenses + assets.total_assets * 0.15,
        },
        investing_activities: {
          equipment_purchases: -5000,
          net_cash_from_investing: -5000,
        },
        financing_activities: {
          owner_contributions: 10000,
          distributions: -2000,
          net_cash_from_financing: 8000,
        },
        net_cash_flow: revenue.total_revenue - expenses.total_expenses + assets.total_assets * 0.15 - 5000 + 8000,
      },
    }

    return NextResponse.json({
      success: true,
      data: financialData,
    })
  } catch (error) {
    console.error("Error generating financial data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
