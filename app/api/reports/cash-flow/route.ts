import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const branch = searchParams.get("branch")

    if (!from || !to) {
      return NextResponse.json({ success: false, error: "Date range is required" }, { status: 400 })
    }

    console.log("📊 Generating cash flow statement:", { from, to, branch })

    // Get operating cash flows with correct column names
    let operatingFlows
    if (branch && branch !== "all") {
      operatingFlows = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'fee_collection' THEN amount ELSE 0 END), 0) as fee_collections,
          COALESCE(SUM(CASE WHEN transaction_type = 'commission_payment' THEN -amount ELSE 0 END), 0) as commission_payments,
          COALESCE(SUM(CASE WHEN transaction_type = 'expense_payment' THEN -amount ELSE 0 END), 0) as expense_payments
        FROM (
          SELECT 'fee_collection' as transaction_type, fee as amount, branch_id FROM momo_transactions 
          WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}
          UNION ALL
          SELECT 'fee_collection' as transaction_type, fee as amount, branch_id FROM agency_banking_transactions 
          WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}
          UNION ALL
          SELECT 'fee_collection' as transaction_type, fee_charged as amount, branch_id FROM e_zwich_card_issuances 
          WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}
          UNION ALL
          SELECT 'commission_payment' as transaction_type, amount, branch_id FROM commissions 
          WHERE created_at BETWEEN ${from} AND ${to} AND status = 'paid' AND branch_id = ${branch}
          UNION ALL
          SELECT 'expense_payment' as transaction_type, amount, branch_id FROM expenses 
          WHERE created_at BETWEEN ${from} AND ${to} AND status = 'approved' AND branch_id = ${branch}
        ) cash_flows
      `
    } else {
      operatingFlows = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'fee_collection' THEN amount ELSE 0 END), 0) as fee_collections,
          COALESCE(SUM(CASE WHEN transaction_type = 'commission_payment' THEN -amount ELSE 0 END), 0) as commission_payments,
          COALESCE(SUM(CASE WHEN transaction_type = 'expense_payment' THEN -amount ELSE 0 END), 0) as expense_payments
        FROM (
          SELECT 'fee_collection' as transaction_type, fee as amount, branch_id FROM momo_transactions 
          WHERE created_at BETWEEN ${from} AND ${to}
          UNION ALL
          SELECT 'fee_collection' as transaction_type, fee as amount, branch_id FROM agency_banking_transactions 
          WHERE created_at BETWEEN ${from} AND ${to}
          UNION ALL
          SELECT 'fee_collection' as transaction_type, fee_charged as amount, branch_id FROM e_zwich_card_issuances 
          WHERE created_at BETWEEN ${from} AND ${to}
          UNION ALL
          SELECT 'commission_payment' as transaction_type, amount, branch_id FROM commissions 
          WHERE created_at BETWEEN ${from} AND ${to} AND status = 'paid'
          UNION ALL
          SELECT 'expense_payment' as transaction_type, amount, branch_id FROM expenses 
          WHERE created_at BETWEEN ${from} AND ${to} AND status = 'approved'
        ) cash_flows
      `
    }

    // Get investing cash flows
    let investingFlows
    if (branch && branch !== "all") {
      investingFlows = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'float_investment' THEN -amount ELSE 0 END), 0) as float_investments,
          COALESCE(SUM(CASE WHEN transaction_type = 'equipment' THEN -amount ELSE 0 END), 0) as equipment_purchases
        FROM (
          SELECT 'float_investment' as transaction_type, amount, branch_id FROM float_transactions 
          WHERE created_at BETWEEN ${from} AND ${to} AND transaction_type = 'allocation' AND branch_id = ${branch}
          UNION ALL
          SELECT 'equipment' as transaction_type, amount, branch_id FROM expenses 
          WHERE created_at BETWEEN ${from} AND ${to} AND description LIKE '%equipment%' AND branch_id = ${branch}
        ) investing_flows
      `
    } else {
      investingFlows = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'float_investment' THEN -amount ELSE 0 END), 0) as float_investments,
          COALESCE(SUM(CASE WHEN transaction_type = 'equipment' THEN -amount ELSE 0 END), 0) as equipment_purchases
        FROM (
          SELECT 'float_investment' as transaction_type, amount, branch_id FROM float_transactions 
          WHERE created_at BETWEEN ${from} AND ${to} AND transaction_type = 'allocation'
          UNION ALL
          SELECT 'equipment' as transaction_type, amount, branch_id FROM expenses 
          WHERE created_at BETWEEN ${from} AND ${to} AND description LIKE '%equipment%'
        ) investing_flows
      `
    }

    // Get financing cash flows (placeholder - would need actual financing data)
    const financingFlows = {
      capital_contributions: 0,
      loan_proceeds: 0,
      loan_repayments: 0,
    }

    // Get current cash balances
    let cashBalances
    if (branch && branch !== "all") {
      cashBalances = await sql`
        SELECT 
          COALESCE(SUM(current_balance), 0) as current_cash
        FROM float_accounts 
        WHERE is_active = true AND branch_id = ${branch}
      `
    } else {
      cashBalances = await sql`
        SELECT 
          COALESCE(SUM(current_balance), 0) as current_cash
        FROM float_accounts 
        WHERE is_active = true
      `
    }

    // Calculate net income
    let netIncomeQuery_result
    if (branch && branch !== "all") {
      netIncomeQuery_result = await sql`
        SELECT 
          COALESCE(
            (SELECT SUM(fee) FROM momo_transactions WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}) +
            (SELECT SUM(fee) FROM agency_banking_transactions WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}) +
            (SELECT SUM(fee_charged) FROM e_zwich_card_issuances WHERE created_at BETWEEN ${from} AND ${to} AND branch_id = ${branch}) +
            (SELECT SUM(amount) FROM commissions WHERE created_at BETWEEN ${from} AND ${to} AND status = 'paid' AND branch_id = ${branch}) -
            (SELECT SUM(amount) FROM expenses WHERE created_at BETWEEN ${from} AND ${to} AND status = 'approved' AND branch_id = ${branch}),
            0
          ) as net_income
      `
    } else {
      netIncomeQuery_result = await sql`
        SELECT 
          COALESCE(
            (SELECT SUM(fee) FROM momo_transactions WHERE created_at BETWEEN ${from} AND ${to}) +
            (SELECT SUM(fee) FROM agency_banking_transactions WHERE created_at BETWEEN ${from} AND ${to}) +
            (SELECT SUM(fee_charged) FROM e_zwich_card_issuances WHERE created_at BETWEEN ${from} AND ${to}) +
            (SELECT SUM(amount) FROM commissions WHERE created_at BETWEEN ${from} AND ${to} AND status = 'paid') -
            (SELECT SUM(amount) FROM expenses WHERE created_at BETWEEN ${from} AND ${to} AND status = 'approved'),
            0
          ) as net_income
      `
    }

    const operating = operatingFlows[0]
    const investing = investingFlows[0]
    const financing = financingFlows

    const netIncome = Number(netIncomeQuery_result[0].net_income)
    const operatingTotal =
      netIncome +
      Number(operating.fee_collections) +
      Number(operating.commission_payments) +
      Number(operating.expense_payments)
    const investingTotal = Number(investing.float_investments) + Number(investing.equipment_purchases)
    const financingTotal =
      Number(financing.capital_contributions) + Number(financing.loan_proceeds) + Number(financing.loan_repayments)

    const netChange = operatingTotal + investingTotal + financingTotal
    const currentCash = Number(cashBalances[0].current_cash)
    const beginningCash = currentCash - netChange

    const cashFlowData = {
      operating: {
        net_income: netIncome,
        fee_collections: Number(operating.fee_collections),
        commission_payments: Number(operating.commission_payments),
        expense_payments: Number(operating.expense_payments),
        total: operatingTotal,
      },
      investing: {
        float_investments: Number(investing.float_investments),
        equipment_purchases: Number(investing.equipment_purchases),
        total: investingTotal,
      },
      financing: {
        capital_contributions: Number(financing.capital_contributions),
        loan_proceeds: Number(financing.loan_proceeds),
        loan_repayments: Number(financing.loan_repayments),
        total: financingTotal,
      },
      net_change: netChange,
      beginning_cash: beginningCash,
      ending_cash: currentCash,
      status: "complete",
    }

    console.log("✅ Cash flow statement generated successfully")

    return NextResponse.json({
      success: true,
      data: cashFlowData,
    })
  } catch (error) {
    console.error("❌ Error generating cash flow statement:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate cash flow statement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
