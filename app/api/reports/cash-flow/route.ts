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
    const effectiveBranchId = user.role === "Admin" ? branch : user.branchId;
    const branchFilter =
      effectiveBranchId && effectiveBranchId !== "all"
        ? sql`AND branch_id = ${effectiveBranchId}`
        : sql``;

    // Date filter
    const dateFilter =
      from && to ? sql`AND created_at::date BETWEEN ${from} AND ${to}` : sql``;

    // OPERATING ACTIVITIES
    // Net Income
    const revenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM (
        SELECT amount FROM agency_banking_transactions WHERE status = 'completed' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM momo_transactions WHERE status = 'completed' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM e_zwich_withdrawals WHERE status = 'completed' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM power_transactions WHERE status = 'completed' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM jumia_transactions WHERE status = 'completed' ${branchFilter} ${dateFilter}
      ) completed_transactions
    `;
    const totalRevenue = Number(revenueResult[0].total_revenue) || 0;

    const expensesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses 
      WHERE status IN ('approved', 'paid') ${branchFilter} ${dateFilter}
    `;
    const totalExpenses = Number(expensesResult[0].total_expenses) || 0;

    const netIncome = totalRevenue - totalExpenses;

    // Depreciation (from fixed assets)
    const depreciationResult = await sql`
      SELECT COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation
      FROM fixed_assets 
      WHERE status = 'active' ${branchFilter}
    `;
    const depreciation = Number(depreciationResult[0].total_depreciation) || 0;

    // Changes in Working Capital
    // Accounts Receivable (pending transactions)
    const receivablesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_receivables
      FROM (
        SELECT amount FROM agency_banking_transactions WHERE status = 'pending' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM momo_transactions WHERE status = 'pending' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM e_zwich_withdrawals WHERE status = 'pending' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM power_transactions WHERE status = 'pending' ${branchFilter} ${dateFilter}
        UNION ALL
        SELECT amount FROM jumia_transactions WHERE status = 'pending' ${branchFilter} ${dateFilter}
      ) pending_transactions
    `;
    const accountsReceivable =
      Number(receivablesResult[0].total_receivables) || 0;

    // Accounts Payable (pending expenses)
    const payablesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_payables
      FROM expenses 
      WHERE status IN ('pending', 'approved') ${branchFilter} ${dateFilter}
    `;
    const accountsPayable = Number(payablesResult[0].total_payables) || 0;

    const netCashFromOperations =
      netIncome + depreciation - accountsReceivable + accountsPayable;

    // INVESTING ACTIVITIES
    // Purchase of Fixed Assets
    const fixedAssetsPurchaseResult = await sql`
      SELECT COALESCE(SUM(purchase_cost), 0) as total_purchase
      FROM fixed_assets 
      WHERE purchase_date BETWEEN ${from} AND ${to} ${branchFilter}
    `;
    const purchaseOfFixedAssets =
      Number(fixedAssetsPurchaseResult[0].total_purchase) || 0;

    const netCashFromInvesting = -purchaseOfFixedAssets;

    // FINANCING ACTIVITIES
    // Dividends (represented by commissions paid)
    const dividendsResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_commissions
      FROM commissions 
      WHERE status = 'paid' ${branchFilter} ${dateFilter}
    `;
    const dividendsPaid = Number(dividendsResult[0].total_commissions) || 0;

    const netCashFromFinancing = -dividendsPaid;

    // Net Change in Cash
    const netChangeInCash =
      netCashFromOperations + netCashFromInvesting + netCashFromFinancing;

    // Ending Cash Balance
    const endingCashResult = await sql`
      SELECT COALESCE(SUM(current_balance), 0) as total_cash
      FROM float_accounts 
      WHERE is_active = true ${branchFilter}
    `;
    const endingCashBalance = Number(endingCashResult[0].total_cash) || 0;

    return NextResponse.json({
      success: true,
      data: {
        period: { from, to },
        operatingActivities: {
          netIncome,
          depreciation,
          accountsReceivable: -accountsReceivable,
          accountsPayable: accountsPayable,
          netCashFromOperations,
        },
        investingActivities: {
          purchaseOfFixedAssets: -purchaseOfFixedAssets,
          netCashFromInvesting,
        },
        financingActivities: {
          dividendsPaid: -dividendsPaid,
          netCashFromFinancing,
        },
        summary: {
          netChangeInCash,
          endingCashBalance,
        },
        branchFilter: effectiveBranchId,
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
