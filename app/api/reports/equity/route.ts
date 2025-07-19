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

    // Get GL account balances for equity accounts
    const equityAccounts = await sql`
      SELECT 
        id,
        code,
        name,
        type,
        balance,
        is_active
      FROM gl_accounts
      WHERE type = 'Equity' AND is_active = true
      ORDER BY code
    `;

    // Get equity transactions from GL
    const equityTransactions = await sql`
      SELECT 
        gt.id,
        gt.date,
        gt.source_module,
        gt.description,
        gt.amount,
        gt.status,
        je.account_id,
        je.debit,
        je.credit,
        a.code as account_code,
        a.name as account_name,
        b.name as branch_name
      FROM gl_transactions gt
      JOIN gl_journal_entries je ON gt.id = je.transaction_id
      JOIN gl_accounts a ON je.account_id = a.id
      LEFT JOIN branches b ON gt.branch_id = b.id
      WHERE a.type = 'Equity' 
        AND gt.status = 'posted'
        ${branchFilter}
        ${dateFilter}
      ORDER BY gt.date DESC
    `;

    // Calculate equity components
    const equityComponents = await sql`
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
        END as equity_type
      FROM account_balances
      ORDER BY code
    `;

    // Get retained earnings breakdown
    const retainedEarningsBreakdown = await sql`
      SELECT 
        DATE_TRUNC('month', gt.date) as month,
        COALESCE(SUM(CASE WHEN je.credit > 0 THEN je.credit ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN je.debit > 0 THEN je.debit ELSE 0 END), 0) as debits,
        COALESCE(SUM(je.credit - je.debit), 0) as net_change
      FROM gl_transactions gt
      JOIN gl_journal_entries je ON gt.id = je.transaction_id
      JOIN gl_accounts a ON je.account_id = a.id
      WHERE a.type = 'Equity' 
        AND gt.status = 'posted'
        ${branchFilter}
        ${dateFilter}
      GROUP BY DATE_TRUNC('month', gt.date)
      ORDER BY month DESC
      LIMIT 12
    `;

    // Calculate total equity
    const totalEquityResult = await sql`
      SELECT COALESCE(SUM(
        CASE 
          WHEN a.type = 'Equity' THEN COALESCE(SUM(je.credit), 0) - COALESCE(SUM(je.debit), 0)
          ELSE 0
        END
      ), 0) as total_equity
      FROM gl_accounts a
      LEFT JOIN gl_journal_entries je ON a.id = je.account_id
      LEFT JOIN gl_transactions gt ON je.transaction_id = gt.id AND gt.status = 'posted'
      WHERE a.type = 'Equity' AND a.is_active = true
      ${branchFilter}
      GROUP BY a.id, a.code, a.name, a.type
    `;

    const totalEquity = totalEquityResult.reduce(
      (sum, row) => sum + Number(row.total_equity || 0),
      0
    );

    // Get equity changes over time
    const equityChanges = await sql`
      SELECT 
        gt.date,
        gt.source_module,
        gt.description,
        COALESCE(SUM(je.credit), 0) as total_credits,
        COALESCE(SUM(je.debit), 0) as total_debits,
        COALESCE(SUM(je.credit - je.debit), 0) as net_change
      FROM gl_transactions gt
      JOIN gl_journal_entries je ON gt.id = je.transaction_id
      JOIN gl_accounts a ON je.account_id = a.id
      WHERE a.type = 'Equity' 
        AND gt.status = 'posted'
        ${branchFilter}
        ${dateFilter}
      GROUP BY gt.id, gt.date, gt.source_module, gt.description
      ORDER BY gt.date DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEquity,
          equityAccounts: equityAccounts.length,
          totalTransactions: equityTransactions.length,
          reportPeriod: { from, to },
        },
        equityAccounts,
        equityComponents,
        equityTransactions,
        retainedEarningsBreakdown,
        equityChanges,
        reportDate: new Date().toISOString(),
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating equity report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate equity report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
