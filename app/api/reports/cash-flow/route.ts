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

    // Operating Activities
    const operatingActivities = await sql`
      WITH revenue_data AS (
        -- MoMo Revenue
        SELECT 
          'MoMo Fees' as item,
          COALESCE(SUM(fee), 0) as amount,
          'inflow' as type
        FROM momo_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Agency Banking Revenue
        SELECT 
          'Agency Banking Fees' as item,
          COALESCE(SUM(fee), 0) as amount,
          'inflow' as type
        FROM agency_banking_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- E-Zwich Revenue
        SELECT 
          'E-Zwich Fees' as item,
          COALESCE(SUM(fee), 0) as amount,
          'inflow' as type
        FROM e_zwich_withdrawals
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Power Revenue
        SELECT 
          'Power Commission' as item,
          COALESCE(SUM(commission), 0) as amount,
          'inflow' as type
        FROM power_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Jumia Revenue
        SELECT 
          'Jumia Fees' as item,
          COALESCE(SUM(fee), 0) as amount,
          'inflow' as type
        FROM jumia_transactions
        WHERE status = 'completed' ${branchFilter} ${dateFilter}
        
        UNION ALL
        
        -- Commission Revenue
        SELECT 
          'Commission Revenue' as item,
          COALESCE(SUM(amount), 0) as amount,
          'inflow' as type
        FROM commissions
        WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
      ),
      expense_data AS (
        SELECT 
          'Operating Expenses' as item,
          COALESCE(SUM(amount), 0) as amount,
          'outflow' as type
        FROM expenses
        WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
      )
      SELECT * FROM revenue_data
      UNION ALL
      SELECT * FROM expense_data
      ORDER BY type DESC, amount DESC
    `;

    // Investing Activities
    const investingActivities = await sql`
      SELECT 
        'Fixed Assets Purchase' as item,
        COALESCE(SUM(purchase_cost), 0) as amount,
        'outflow' as type
      FROM fixed_assets
      WHERE purchase_date BETWEEN ${from} AND ${to} ${branchFilter}
      
      UNION ALL
      
      SELECT 
        'Float Account Investments' as item,
        COALESCE(SUM(current_balance), 0) as amount,
        'outflow' as type
      FROM float_accounts
      WHERE is_active = true ${branchFilter}
    `;

    // Financing Activities
    const financingActivities = await sql`
      SELECT 
        'Owner Investment' as item,
        COALESCE(SUM(credit), 0) as amount,
        'inflow' as type
      FROM gl_journal_entries je
      JOIN gl_transactions gt ON je.transaction_id = gt.id
      JOIN gl_accounts a ON je.account_id = a.id
      WHERE a.type = 'Equity' 
        AND gt.status = 'posted'
        AND gt.date BETWEEN ${from} AND ${to}
        ${branchFilter}
      
      UNION ALL
      
      SELECT 
        'Dividends Paid' as item,
        COALESCE(SUM(debit), 0) as amount,
        'outflow' as type
      FROM gl_journal_entries je
      JOIN gl_transactions gt ON je.transaction_id = gt.id
      JOIN gl_accounts a ON je.account_id = a.id
      WHERE a.type = 'Equity' 
        AND gt.status = 'posted'
        AND gt.date BETWEEN ${from} AND ${to}
        ${branchFilter}
    `;

    // Calculate totals
    const operatingInflows = operatingActivities
      .filter((item) => item.type === "inflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const operatingOutflows = operatingActivities
      .filter((item) => item.type === "outflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const netOperatingCash = operatingInflows - operatingOutflows;

    const investingOutflows = investingActivities
      .filter((item) => item.type === "outflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const investingInflows = investingActivities
      .filter((item) => item.type === "inflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const netInvestingCash = investingInflows - investingOutflows;

    const financingInflows = financingActivities
      .filter((item) => item.type === "inflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const financingOutflows = financingActivities
      .filter((item) => item.type === "outflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const netFinancingCash = financingInflows - financingOutflows;

    const netCashChange =
      netOperatingCash + netInvestingCash + netFinancingCash;

    // Get beginning and ending cash balances
    const cashBalances = await sql`
      WITH float_balances AS (
        SELECT COALESCE(SUM(current_balance), 0) as total_balance
        FROM float_accounts
        WHERE is_active = true ${branchFilter}
      ),
      gl_cash_balances AS (
        SELECT 
          COALESCE(SUM(CASE WHEN a.type = 'Asset' THEN je.debit - je.credit ELSE 0 END), 0) as cash_balance
        FROM gl_accounts a
        LEFT JOIN gl_journal_entries je ON a.id = je.account_id
        LEFT JOIN gl_transactions gt ON je.transaction_id = gt.id AND gt.status = 'posted'
        WHERE a.code LIKE '100%' AND a.is_active = true
        ${branchFilter}
        ${dateFilter}
      )
      SELECT 
        fb.total_balance as float_balance,
        gl.cash_balance as gl_cash_balance
      FROM float_balances fb, gl_cash_balances gl
    `;

    const currentCashBalance =
      Number(cashBalances[0]?.float_balance || 0) +
      Number(cashBalances[0]?.gl_cash_balance || 0);
    const beginningCashBalance = currentCashBalance - netCashChange;

    return NextResponse.json({
      success: true,
      data: {
        operating: {
          activities: operatingActivities,
          inflows: operatingInflows,
          outflows: operatingOutflows,
          netCash: netOperatingCash,
        },
        investing: {
          activities: investingActivities,
          inflows: investingInflows,
          outflows: investingOutflows,
          netCash: netInvestingCash,
        },
        financing: {
          activities: financingActivities,
          inflows: financingInflows,
          outflows: financingOutflows,
          netCash: netFinancingCash,
        },
        summary: {
          beginningCashBalance,
          netCashChange,
          endingCashBalance: beginningCashBalance + netCashChange,
          currentCashBalance,
        },
        reportDate: new Date().toISOString(),
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating cash flow report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate cash flow report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
