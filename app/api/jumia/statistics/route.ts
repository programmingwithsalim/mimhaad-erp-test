import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const branchId = searchParams.get("branchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    console.log("📊 Fetching Jumia statistics with filters:", {
      branchId,
      dateFrom,
      dateTo,
    });

    // Build WHERE conditions as template literals
    const conditions = [];
    if (branchId && branchId !== "all") {
      conditions.push(sql`branch_id = ${branchId}`);
    }
    if (dateFrom) {
      conditions.push(sql`created_at >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`created_at <= ${dateTo}`);
    }
    let whereSql = sql``;
    if (conditions.length > 0) {
      whereSql = sql`WHERE ${sql.join(conditions, sql` AND `)}`;
    }

    // Get transaction statistics
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount
      FROM jumia_transactions
      ${whereSql}
    `;
    const stats = statsResult[0] || {};

    // Get daily breakdown for the last 30 days
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM jumia_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${
        branchId && branchId !== "all"
          ? sql`AND branch_id = ${branchId}`
          : sql``
      }
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get transaction type breakdown
    const typeStats = await sql`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM jumia_transactions
      ${whereSql}
      GROUP BY transaction_type
      ORDER BY total_amount DESC
    `;

    const statistics = {
      summary: {
        totalCount: Number(stats.total_count || 0),
        totalAmount: Number(stats.total_amount || 0),
        completedCount: Number(stats.completed_count || 0),
        completedAmount: Number(stats.completed_amount || 0),
        pendingCount: Number(stats.pending_count || 0),
        pendingAmount: Number(stats.pending_amount || 0),
        failedCount: Number(stats.failed_count || 0),
        failedAmount: Number(stats.failed_amount || 0),
      },
      byType: typeStats.map((t: any) => ({
        type: t.transaction_type || "Unknown",
        count: Number(t.count || 0),
        amount: Number(t.total_amount || 0),
      })),
      daily: dailyStats.map((d: any) => ({
        date: d.date,
        count: Number(d.count || 0),
        amount: Number(d.total_amount || 0),
      })),
    };

    console.log("✅ Jumia statistics fetched successfully");

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("❌ Error fetching Jumia statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Jumia statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
