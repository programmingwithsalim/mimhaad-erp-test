import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
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

    // Date filter (as of specific date)
    const dateFilter = date ? sql`AND created_at::date <= ${date}` : sql``;

    // Get assets from GL accounts
    const assetsResult = await sql`
      WITH account_balances AS (
        SELECT 
          a.id, 
          a.code, 
          a.name, 
          a.type,
          CASE 
            WHEN a.type = 'Asset' THEN COALESCE(SUM(je.debit), 0) - COALESCE(SUM(je.credit), 0)
            ELSE 0
          END as net_balance
        FROM gl_accounts a
        LEFT JOIN gl_journal_entries je ON a.id = je.account_id
        LEFT JOIN gl_transactions gt ON je.transaction_id = gt.id AND gt.status = 'posted'
        WHERE a.type = 'Asset' AND a.is_active = true
        ${branchFilter}
        ${dateFilter}
        GROUP BY a.id, a.code, a.name, a.type
      )
      SELECT 
        code,
        name,
        net_balance,
        CASE 
          WHEN code LIKE '100%' THEN 'Current Assets'
          WHEN code LIKE '150%' THEN 'Fixed Assets'
          ELSE 'Other Assets'
        END as asset_category
      FROM account_balances
      WHERE net_balance > 0
      ORDER BY code
    `;

    // Get liabilities from GL accounts
    const liabilitiesResult = await sql`
      WITH account_balances AS (
        SELECT 
          a.id, 
          a.code, 
          a.name, 
          a.type,
          CASE 
            WHEN a.type = 'Liability' THEN COALESCE(SUM(je.credit), 0) - COALESCE(SUM(je.debit), 0)
            ELSE 0
          END as net_balance
        FROM gl_accounts a
        LEFT JOIN gl_journal_entries je ON a.id = je.account_id
        LEFT JOIN gl_transactions gt ON je.transaction_id = gt.id AND gt.status = 'posted'
        WHERE a.type = 'Liability' AND a.is_active = true
        ${branchFilter}
        ${dateFilter}
        GROUP BY a.id, a.code, a.name, a.type
      )
      SELECT 
        code,
        name,
        net_balance,
        CASE 
          WHEN code LIKE '200%' THEN 'Current Liabilities'
          WHEN code LIKE '250%' THEN 'Long-term Liabilities'
          ELSE 'Other Liabilities'
        END as liability_category
      FROM account_balances
      WHERE net_balance > 0
      ORDER BY code
    `;

    // Get equity from GL accounts
    const equityResult = await sql`
      WITH account_balances AS (
        SELECT 
          a.id, 
          a.code, 
          a.name, 
          a.type,
          CASE 
            WHEN a.type = 'Equity' THEN COALESCE(SUM(je.credit), 0) - COALESCE(SUM(je.debit), 0)
            ELSE 0
          END as net_balance
        FROM gl_accounts a
        LEFT JOIN gl_journal_entries je ON a.id = je.account_id
        LEFT JOIN gl_transactions gt ON je.transaction_id = gt.id AND gt.status = 'posted'
        WHERE a.type = 'Equity' AND a.is_active = true
        ${branchFilter}
        ${dateFilter}
        GROUP BY a.id, a.code, a.name, a.type
      )
      SELECT 
        code,
        name,
        net_balance,
        CASE 
          WHEN code LIKE '3001%' THEN 'Share Capital'
          WHEN code LIKE '3002%' THEN 'Retained Earnings'
          WHEN code LIKE '3003%' THEN 'Current Year Earnings'
          ELSE 'Other Equity'
        END as equity_category
      FROM account_balances
      WHERE net_balance > 0
      ORDER BY code
    `;

    // Get fixed assets from fixed_assets table
    const fixedAssetsResult = await sql`
      SELECT 
        COUNT(*) as total_assets,
        COALESCE(SUM(purchase_cost), 0) as total_cost,
        COALESCE(SUM(current_value), 0) as total_value,
        COALESCE(SUM(accumulated_depreciation), 0) as total_depreciation
      FROM fixed_assets
      WHERE status = 'active' ${branchFilter}
    `;

    // Calculate totals
    const totalAssets = assetsResult.reduce(
      (sum, item) => sum + Number(item.net_balance || 0),
      0
    );
    const totalLiabilities = liabilitiesResult.reduce(
      (sum, item) => sum + Number(item.net_balance || 0),
      0
    );
    const totalEquity = equityResult.reduce(
      (sum, item) => sum + Number(item.net_balance || 0),
      0
    );
    const fixedAssets = fixedAssetsResult[0];

    // Group assets by category
    const currentAssets = assetsResult.filter(
      (item) => item.asset_category === "Current Assets"
    );
    const fixedAssetsList = assetsResult.filter(
      (item) => item.asset_category === "Fixed Assets"
    );
    const otherAssets = assetsResult.filter(
      (item) => item.asset_category === "Other Assets"
    );

    // Group liabilities by category
    const currentLiabilities = liabilitiesResult.filter(
      (item) => item.liability_category === "Current Liabilities"
    );
    const longTermLiabilities = liabilitiesResult.filter(
      (item) => item.liability_category === "Long-term Liabilities"
    );
    const otherLiabilities = liabilitiesResult.filter(
      (item) => item.liability_category === "Other Liabilities"
    );

    // Group equity by category
    const shareCapital = equityResult.filter(
      (item) => item.equity_category === "Share Capital"
    );
    const retainedEarnings = equityResult.filter(
      (item) => item.equity_category === "Retained Earnings"
    );
    const currentYearEarnings = equityResult.filter(
      (item) => item.equity_category === "Current Year Earnings"
    );
    const otherEquity = equityResult.filter(
      (item) => item.equity_category === "Other Equity"
    );

    return NextResponse.json({
      success: true,
      data: {
        assets: {
          current: {
            items: currentAssets,
            total: currentAssets.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          fixed: {
            items: fixedAssetsList,
            total: fixedAssetsList.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
            fixedAssetsData: {
              totalAssets: Number(fixedAssets.total_assets) || 0,
              totalCost: Number(fixedAssets.total_cost) || 0,
              totalValue: Number(fixedAssets.total_value) || 0,
              totalDepreciation: Number(fixedAssets.total_depreciation) || 0,
            },
          },
          other: {
            items: otherAssets,
            total: otherAssets.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          total: totalAssets,
        },
        liabilities: {
          current: {
            items: currentLiabilities,
            total: currentLiabilities.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          longTerm: {
            items: longTermLiabilities,
            total: longTermLiabilities.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          other: {
            items: otherLiabilities,
            total: otherLiabilities.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          total: totalLiabilities,
        },
        equity: {
          shareCapital: {
            items: shareCapital,
            total: shareCapital.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          retainedEarnings: {
            items: retainedEarnings,
            total: retainedEarnings.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          currentYearEarnings: {
            items: currentYearEarnings,
            total: currentYearEarnings.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          other: {
            items: otherEquity,
            total: otherEquity.reduce(
              (sum, item) => sum + Number(item.net_balance || 0),
              0
            ),
          },
          total: totalEquity,
        },
        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          netWorth: totalAssets - totalLiabilities,
          balanceCheck:
            Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        },
        reportDate: date || new Date().toISOString().split("T")[0],
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating balance sheet report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate balance sheet report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
