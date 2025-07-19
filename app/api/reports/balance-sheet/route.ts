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

    // Date filter for transactions
    const dateFilter =
      from && to ? sql`AND created_at::date BETWEEN ${from} AND ${to}` : sql``;

    // ASSETS SECTION
    // 1. Current Assets
    // Cash and Cash Equivalents (Float Accounts)
    const cashResult = await sql`
      SELECT COALESCE(SUM(current_balance), 0) as total_cash
      FROM float_accounts 
      WHERE is_active = true ${branchFilter}
    `;
    const totalCash = Number(cashResult[0].total_cash) || 0;

    // Accounts Receivable (Pending transactions)
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
    const totalReceivables =
      Number(receivablesResult[0].total_receivables) || 0;

    // 2. Fixed Assets
    const fixedAssetsResult = await sql`
      SELECT 
        COALESCE(SUM(current_value), 0) as total_fixed_assets,
        COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation,
        COUNT(*) as asset_count
      FROM fixed_assets 
      WHERE status = 'active' ${branchFilter}
    `;
    const totalFixedAssets =
      Number(fixedAssetsResult[0].total_fixed_assets) || 0;
    const totalDepreciation =
      Number(fixedAssetsResult[0].total_depreciation) || 0;
    const netFixedAssets = totalFixedAssets - totalDepreciation;

    // LIABILITIES SECTION
    // Accounts Payable (Pending expenses)
    const payablesResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_payables
      FROM expenses 
      WHERE status IN ('pending', 'approved') ${branchFilter} ${dateFilter}
    `;
    const totalPayables = Number(payablesResult[0].total_payables) || 0;

    // EQUITY SECTION
    // Retained Earnings (Net income from transactions)
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

    const retainedEarnings = totalRevenue - totalExpenses;

    // Calculate totals
    const totalAssets = totalCash + totalReceivables + netFixedAssets;
    const totalLiabilities = totalPayables;
    const totalEquity = retainedEarnings;

    return NextResponse.json({
      success: true,
      data: {
        asOf: new Date().toISOString(),
        assets: {
          current: {
            cashAndCashEquivalents: totalCash,
            accountsReceivable: totalReceivables,
            totalCurrent: totalCash + totalReceivables,
          },
          fixed: {
            grossFixedAssets: totalFixedAssets,
            accumulatedDepreciation: totalDepreciation,
            netFixedAssets: netFixedAssets,
          },
          total: totalAssets,
        },
        liabilities: {
          current: {
            accountsPayable: totalPayables,
            totalCurrent: totalPayables,
          },
          total: totalLiabilities,
        },
        equity: {
          retainedEarnings: retainedEarnings,
          totalEquity: totalEquity,
        },
        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          balanceCheck: totalAssets === totalLiabilities + totalEquity,
        },
        branchFilter: effectiveBranchId,
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate balance sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
