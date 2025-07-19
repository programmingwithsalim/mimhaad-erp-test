import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    console.log("🔍 Profit-Loss API called");
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branch = searchParams.get("branch");

    console.log("📅 Date range:", { from, to });
    console.log("🏢 Branch:", branch);

    // Get user context for authorization
    let user;
    try {
      user = await getCurrentUser(request);
      console.log("👤 User authenticated:", {
        name: user.name,
        role: user.role,
        branchId: user.branchId,
      });
    } catch (error) {
      console.error("❌ Authentication failed:", error);
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

    console.log("🎯 Effective branch filter:", effectiveBranchId);

    // Date filter
    const dateFilter =
      from && to ? sql`AND created_at::date BETWEEN ${from} AND ${to}` : sql``;

    console.log("📅 Date filter applied:", !!dateFilter);

    // REVENUE SECTION
    console.log("💰 Starting revenue queries...");

    // Declare variables outside try-catch so they're accessible
    let agencyRevenue, momoRevenue, ezwichRevenue, powerRevenue, jumiaRevenue;

    try {
      // Get revenue by service type
      [agencyRevenue, momoRevenue, ezwichRevenue, powerRevenue, jumiaRevenue] =
        await Promise.all([
          sql`SELECT COALESCE(SUM(amount), 0) as revenue, COALESCE(SUM(fee), 0) as fees FROM agency_banking_transactions WHERE status = 'completed' ${branchFilter} ${
            from && to
              ? sql`AND agency_banking_transactions.created_at::date BETWEEN ${from} AND ${to}`
              : sql``
          }`,
          sql`SELECT COALESCE(SUM(amount), 0) as revenue, COALESCE(SUM(fee), 0) as fees FROM momo_transactions WHERE status = 'completed' ${branchFilter} ${
            from && to
              ? sql`AND momo_transactions.created_at::date BETWEEN ${from} AND ${to}`
              : sql``
          }`,
          sql`SELECT COALESCE(SUM(amount), 0) as revenue, COALESCE(SUM(fee), 0) as fees FROM e_zwich_withdrawals WHERE status = 'completed' ${branchFilter} ${
            from && to
              ? sql`AND e_zwich_withdrawals.created_at::date BETWEEN ${from} AND ${to}`
              : sql``
          }`,
          sql`SELECT COALESCE(SUM(amount), 0) as revenue, COALESCE(SUM(fee), 0) as fees FROM power_transactions WHERE status = 'completed' ${branchFilter} ${
            from && to
              ? sql`AND power_transactions.created_at::date BETWEEN ${from} AND ${to}`
              : sql``
          }`,
          sql`SELECT COALESCE(SUM(amount), 0) as revenue, COALESCE(SUM(fee), 0) as fees FROM jumia_transactions WHERE status = 'completed' ${branchFilter} ${
            from && to
              ? sql`AND jumia_transactions.created_at::date BETWEEN ${from} AND ${to}`
              : sql``
          }`,
        ]);

      console.log("📊 Revenue results:", {
        agency: agencyRevenue[0],
        momo: momoRevenue[0],
        ezwich: ezwichRevenue[0],
        power: powerRevenue[0],
        jumia: jumiaRevenue[0],
      });
    } catch (dbError) {
      console.error("❌ Database error in revenue queries:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection error",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
        },
        { status: 500 }
      );
    }

    const revenueBreakdown = [
      {
        service: "Agency Banking",
        revenue: Number(agencyRevenue[0].revenue) || 0,
        fees: Number(agencyRevenue[0].fees) || 0,
      },
      {
        service: "MOMO",
        revenue: Number(momoRevenue[0].revenue) || 0,
        fees: Number(momoRevenue[0].fees) || 0,
      },
      {
        service: "E-ZWICH",
        revenue: Number(ezwichRevenue[0].revenue) || 0,
        fees: Number(ezwichRevenue[0].fees) || 0,
      },
      {
        service: "Power",
        revenue: Number(powerRevenue[0].revenue) || 0,
        fees: Number(powerRevenue[0].fees) || 0,
      },
      {
        service: "Jumia",
        revenue: Number(jumiaRevenue[0].revenue) || 0,
        fees: Number(jumiaRevenue[0].fees) || 0,
      },
    ];

    const totalRevenue = revenueBreakdown.reduce(
      (sum, item) => sum + item.revenue,
      0
    );
    const totalFees = revenueBreakdown.reduce(
      (sum, item) => sum + item.fees,
      0
    );

    // EXPENSES SECTION
    // Get expenses by category
    const expensesByCategory = await sql`
      SELECT 
        eh.category,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COUNT(*) as count
      FROM expenses e
      LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
      WHERE e.status IN ('approved', 'paid') ${branchFilter} ${
      from && to ? sql`AND e.created_at::date BETWEEN ${from} AND ${to}` : sql``
    }
      GROUP BY eh.category
      ORDER BY total_amount DESC
    `;

    const totalExpenses = expensesByCategory.reduce(
      (sum, item) => sum + Number(item.total_amount),
      0
    );

    // COMMISSIONS
    const commissionsResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_commissions
      FROM commissions 
      WHERE status IN ('approved', 'paid') ${branchFilter} ${
      from && to
        ? sql`AND commissions.created_at::date BETWEEN ${from} AND ${to}`
        : sql``
    }
    `;
    const totalCommissions =
      Number(commissionsResult[0].total_commissions) || 0;

    // Calculate profit/loss
    const grossProfit = totalRevenue - totalExpenses;
    const netIncome = grossProfit + totalCommissions;
    const profitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: { from, to },
        revenue: {
          breakdown: revenueBreakdown,
          total: totalRevenue,
          fees: totalFees,
        },
        expenses: {
          breakdown: expensesByCategory,
          total: totalExpenses,
        },
        commissions: {
          total: totalCommissions,
        },
        profitLoss: {
          grossProfit,
          netIncome,
          profitMargin,
        },
        summary: {
          totalRevenue,
          totalExpenses,
          totalCommissions,
          netIncome,
          profitMargin,
        },
        branchFilter: effectiveBranchId,
        generatedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("Error generating profit & loss report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate profit & loss report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
