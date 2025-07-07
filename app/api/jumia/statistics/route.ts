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
    let whereClause = sql``;
    if (branchId && branchId !== "all") {
      whereClause = sql`WHERE branch_id::text = ${branchId} AND deleted = false`;
      if (dateFrom) {
        whereClause = sql`${whereClause} AND created_at >= ${dateFrom}`;
      }
      if (dateTo) {
        whereClause = sql`${whereClause} AND created_at <= ${dateTo}`;
      }
    } else if (dateFrom || dateTo) {
      whereClause = sql`WHERE deleted = false`;
      if (dateFrom) {
        whereClause = sql`${whereClause} AND created_at >= ${dateFrom}`;
        if (dateTo) {
          whereClause = sql`${whereClause} AND created_at <= ${dateTo}`;
        }
      } else if (dateTo) {
        whereClause = sql`${whereClause} AND created_at <= ${dateTo}`;
      }
    } else {
      whereClause = sql`WHERE deleted = false`;
    }

    // Get transaction statistics
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
        COUNT(CASE WHEN transaction_type = 'package_receipt' THEN 1 END) as package_count,
        COUNT(CASE WHEN transaction_type = 'pod_collection' THEN 1 END) as pod_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'pod_collection' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as pod_amount,
        COUNT(CASE WHEN transaction_type = 'settlement' THEN 1 END) as settlement_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'settlement' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as settlement_amount
      FROM jumia_transactions
      ${whereClause}
    `;
    const stats = statsResult[0] || {};

    // Get today's statistics (exclude settlements)
    const todayStats = await sql`
      SELECT 
        COUNT(CASE WHEN transaction_type IN ('package_receipt', 'pod_collection') THEN 1 END) as today_count,
        COALESCE(SUM(CASE WHEN transaction_type IN ('package_receipt', 'pod_collection') THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as today_amount,
        COUNT(CASE WHEN transaction_type = 'pod_collection' THEN 1 END) as today_pod_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'pod_collection' THEN CAST(amount AS DECIMAL) ELSE 0 END), 0) as today_pod_amount
      FROM jumia_transactions
      WHERE created_at >= CURRENT_DATE 
      AND deleted = false
      ${
        branchId && branchId !== "all"
          ? sql`AND branch_id::text = ${branchId}`
          : sql``
      }
    `;
    const todayData = todayStats[0] || {};

    // Get daily breakdown for the last 30 days
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
      FROM jumia_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND deleted = false
      ${
        branchId && branchId !== "all"
          ? sql`AND branch_id::text = ${branchId}`
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
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
      FROM jumia_transactions
      ${whereClause}
      GROUP BY transaction_type
      ORDER BY total_amount DESC
    `;

    // Get Jumia float account balance for this branch
    let float_balance = 0;
    if (branchId && branchId !== "all") {
      const floatResult = await sql`
        SELECT current_balance FROM float_accounts WHERE branch_id = ${branchId} AND account_type = 'jumia' AND is_active = true LIMIT 1
      `;
      if (floatResult.length > 0 && floatResult[0].current_balance != null) {
        float_balance = Number.parseFloat(floatResult[0].current_balance);
      }
    }

    const statistics = {
      // Main statistics for frontend cards
      todayTransactions: Number(todayData.today_count || 0),
      totalTransactions: Number(stats.total_count || 0),
      todayVolume: Number(todayData.today_amount || 0),
      totalVolume: Number(stats.total_amount || 0),
      todayCommission: Number(todayData.today_pod_amount || 0), // POD collections as commission
      totalCommission: Number(stats.pod_amount || 0), // Total POD collections
      activeProviders: 1, // Jumia is always active
      floatBalance: float_balance, // Use backend-calculated float balance
      lowFloatAlerts: 0, // Will be calculated by frontend
      float_balance, // Also expose as float_balance for compatibility

      // Additional detailed data
      summary: {
        totalCount: Number(stats.total_count || 0),
        totalAmount: Number(stats.total_amount || 0),
        packageCount: Number(stats.package_count || 0),
        podCount: Number(stats.pod_count || 0),
        podAmount: Number(stats.pod_amount || 0),
        settlementCount: Number(stats.settlement_count || 0),
        settlementAmount: Number(stats.settlement_amount || 0),
        todayCount: Number(todayData.today_count || 0),
        todayAmount: Number(todayData.today_amount || 0),
        todayPodCount: Number(todayData.today_pod_count || 0),
        todayPodAmount: Number(todayData.today_pod_amount || 0),
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
