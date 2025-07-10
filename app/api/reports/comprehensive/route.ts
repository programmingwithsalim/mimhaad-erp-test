"use server";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// --- SIMPLE REPORTS API: Minimal, robust queries ---

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");
    const branch = searchParams.get("branch");

    // For now, ignore filters and just get all data
    // Later, we can add branch/date filters as needed

    // 1. Total Revenue (sum of amount from all transaction tables)
    const [agency, momo, ezwich, power, jumia] = await Promise.all([
      sql`SELECT COALESCE(SUM(amount),0) as total FROM agency_banking_transactions`,
      sql`SELECT COALESCE(SUM(amount),0) as total FROM momo_transactions`,
      sql`SELECT COALESCE(SUM(amount),0) as total FROM e_zwich_withdrawals`,
      sql`SELECT COALESCE(SUM(amount),0) as total FROM power_transactions`,
      sql`SELECT COALESCE(SUM(amount),0) as total FROM jumia_transactions`,
    ]);
    const totalRevenue =
      Number(agency[0].total) +
      Number(momo[0].total) +
      Number(ezwich[0].total) +
      Number(power[0].total) +
      Number(jumia[0].total);

    // 2. Total Expenses
    const expensesResult =
      await sql`SELECT COALESCE(SUM(amount),0) as total FROM expenses`;
    const totalExpenses = Number(expensesResult[0].total);

    // 3. Total Commissions
    const commissionsResult =
      await sql`SELECT COALESCE(SUM(amount),0) as total FROM commissions`;
    const totalCommissions = Number(commissionsResult[0].total);

    // 4. Cash Position
    const cashResult =
      await sql`SELECT COALESCE(SUM(current_balance),0) as total FROM float_accounts WHERE is_active = true`;
    const cashPosition = Number(cashResult[0].total);

    // 5. Service Breakdown (transactions, volume, fees per table)
    const [agencyStats, momoStats, ezwichStats, powerStats, jumiaStats] =
      await Promise.all([
        sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume, COALESCE(SUM(fee),0) as fees FROM agency_banking_transactions`,
        sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume, COALESCE(SUM(fee),0) as fees FROM momo_transactions`,
        sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume, COALESCE(SUM(fee),0) as fees FROM e_zwich_withdrawals`,
        sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume, COALESCE(SUM(fee),0) as fees FROM power_transactions`,
        sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume, COALESCE(SUM(fee),0) as fees FROM jumia_transactions`,
      ]);
    const services = [
      {
        service: "AGENCY BANKING",
        transactions: Number(agencyStats[0].transactions),
        volume: Number(agencyStats[0].volume),
        fees: Number(agencyStats[0].fees),
      },
      {
        service: "MOMO",
        transactions: Number(momoStats[0].transactions),
        volume: Number(momoStats[0].volume),
        fees: Number(momoStats[0].fees),
      },
      {
        service: "E-ZWICH",
        transactions: Number(ezwichStats[0].transactions),
        volume: Number(ezwichStats[0].volume),
        fees: Number(ezwichStats[0].fees),
      },
      {
        service: "POWER",
        transactions: Number(powerStats[0].transactions),
        volume: Number(powerStats[0].volume),
        fees: Number(powerStats[0].fees),
      },
      {
        service: "JUMIA",
        transactions: Number(jumiaStats[0].transactions),
        volume: Number(jumiaStats[0].volume),
        fees: Number(jumiaStats[0].fees),
      },
    ];

    // 6. Time Series (daily revenue per table, last 30 days)
    const timeSeries = [];
    // (Optional: implement later if needed)

    // 7. Summary
    const summary = {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      cashPosition,
      profitMargin:
        totalRevenue > 0
          ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
          : 0,
      revenueChange: 0, // Placeholder
      expenseChange: 0, // Placeholder
      totalCommissions,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        services,
        timeSeries,
        lastUpdated: new Date().toISOString(),
        hasData: totalRevenue > 0 || totalExpenses > 0,
      },
    });
  } catch (error) {
    console.error("Error fetching simple report data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch simple report data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// --- END SIMPLE REPORTS API ---

// --- OLD CODE (commented out for backup) ---
// --- OLD CODE (commented out for backup) ---
