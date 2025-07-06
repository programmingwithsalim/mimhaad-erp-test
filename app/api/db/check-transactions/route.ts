import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Check all transaction tables
    const results = await Promise.all([
      sql`SELECT COUNT(*) as count, 'momo_transactions' as table_name FROM momo_transactions`,
      sql`SELECT COUNT(*) as count, 'agency_banking_transactions' as table_name FROM agency_banking_transactions`,
      sql`SELECT COUNT(*) as count, 'e_zwich_withdrawals' as table_name FROM e_zwich_withdrawals`,
      sql`SELECT COUNT(*) as count, 'power_transactions' as table_name FROM power_transactions`,
      sql`SELECT COUNT(*) as count, 'jumia_transactions' as table_name FROM jumia_transactions`,
      sql`SELECT COUNT(*) as count, 'expenses' as table_name FROM expenses`,
    ]);

    // Get date ranges for each table
    const dateRanges = await Promise.all([
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM momo_transactions`,
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM agency_banking_transactions`,
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM e_zwich_withdrawals`,
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM power_transactions`,
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM jumia_transactions`,
      sql`SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM expenses`,
    ]);

    const transactionSummary = results.map((result, index) => ({
      table: result[0]?.table_name,
      count: Number(result[0]?.count || 0),
      dateRange: dateRanges[index][0]
        ? {
            min: dateRanges[index][0]?.min_date,
            max: dateRanges[index][0]?.max_date,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactionSummary,
        totalTransactions: transactionSummary.reduce(
          (sum, item) => sum + item.count,
          0
        ),
        hasData: transactionSummary.some((item) => item.count > 0),
      },
    });
  } catch (error) {
    console.error("Error checking transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
