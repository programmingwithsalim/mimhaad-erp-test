import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const branchId = searchParams.get("branchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const provider = searchParams.get("provider");

    console.log("📊 Fetching Power statistics with filters:", {
      branchId,
      dateFrom,
      dateTo,
      provider,
    });

    // Build WHERE conditions using template literals for better safety
    let whereConditions = [];
    let queryParams = [];

    if (branchId && branchId !== "all") {
      whereConditions.push("branch_id::text = $1");
      queryParams.push(branchId);
    }

    if (dateFrom) {
      whereConditions.push("created_at >= $2");
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("created_at <= $3");
      queryParams.push(dateTo);
    }

    if (provider && provider !== "all") {
      whereConditions.push("provider = $4");
      queryParams.push(provider);
    }

    // Add reversal filter
    whereConditions.push("(is_reversal IS NULL OR is_reversal = false)");

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "WHERE (is_reversal IS NULL OR is_reversal = false)";

    // Get transaction statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount,
        COUNT(CASE WHEN status = 'reversed' THEN 1 END) as reversed_count,
        COALESCE(SUM(CASE WHEN status = 'reversed' THEN amount ELSE 0 END), 0) as reversed_amount,
        COUNT(CASE WHEN status = 'deleted' THEN 1 END) as deleted_count,
        COALESCE(SUM(CASE WHEN status = 'deleted' THEN amount ELSE 0 END), 0) as deleted_amount
      FROM power_transactions
      ${whereClause}
    `;

    console.log("🔍 [POWER] Stats query:", statsQuery);
    console.log("🔍 [POWER] Query params:", queryParams);

    const statsResult = await sql.unsafe(statsQuery, queryParams);
    const stats = statsResult[0] || {};

    console.log("📊 [POWER] Stats result:", stats);

    // --- Today's stats ---
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let todayWhere =
      "WHERE (is_reversal IS NULL OR is_reversal = false) AND DATE(created_at) = $1";
    let todayParams = [today];
    if (branchId && branchId !== "all") {
      todayWhere += " AND branch_id::text = $2";
      todayParams.push(branchId);
    }
    if (provider && provider !== "all") {
      todayWhere +=
        branchId && branchId !== "all"
          ? " AND provider = $3"
          : " AND provider = $2";
      todayParams.push(provider);
    }
    const todayStatsQuery = `
      SELECT 
        COUNT(*) as today_count,
        COALESCE(SUM(amount), 0) as today_amount,
        COALESCE(SUM(commission), 0) as today_commission
      FROM power_transactions
      ${todayWhere}
    `;
    const todayStatsResult = await sql.unsafe(todayStatsQuery, todayParams);
    const todayStats = todayStatsResult[0] || {};

    // Get provider breakdown
    const providerQuery = `
      SELECT 
        provider,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      ${whereClause}
      GROUP BY provider
      ORDER BY total_amount DESC
    `;

    const providerResult = await sql.unsafe(providerQuery, queryParams);
    const providerStats = Array.isArray(providerResult) ? providerResult : [];

    // Get daily breakdown for the last 30 days
    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND (is_reversal IS NULL OR is_reversal = false)
      ${branchId && branchId !== "all" ? "AND branch_id::text = $1" : ""}
      ${provider && provider !== "all" ? "AND provider = $2" : ""}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const dailyParams = [];
    if (branchId && branchId !== "all") dailyParams.push(branchId);
    if (provider && provider !== "all") dailyParams.push(provider);

    const dailyResult = await sql.unsafe(dailyQuery, dailyParams);
    const dailyStats = Array.isArray(dailyResult) ? dailyResult : [];

    // Get transaction type breakdown
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      ${whereClause}
      GROUP BY type
      ORDER BY total_amount DESC
    `;

    const typeResult = await sql.unsafe(typeQuery, queryParams);
    const typeStats = Array.isArray(typeResult) ? typeResult : [];

    const statistics = {
      summary: {
        totalCount: Number(stats.total_count || 0),
        totalAmount: Number(stats.total_amount || 0),
        totalCommission: Number(stats.total_commission || 0),
        completedCount: Number(stats.completed_count || 0),
        completedAmount: Number(stats.completed_amount || 0),
        pendingCount: Number(stats.pending_count || 0),
        pendingAmount: Number(stats.pending_amount || 0),
        failedCount: Number(stats.failed_count || 0),
        failedAmount: Number(stats.failed_amount || 0),
        reversedCount: Number(stats.reversed_count || 0),
        reversedAmount: Number(stats.reversed_amount || 0),
        deletedCount: Number(stats.deleted_count || 0),
        deletedAmount: Number(stats.deleted_amount || 0),
        todayCount: Number(todayStats.today_count || 0),
        todayAmount: Number(todayStats.today_amount || 0),
        todayCommission: Number(todayStats.today_commission || 0),
      },
      byProvider: providerStats.map((p: any) => ({
        provider: p.provider || "Unknown",
        count: Number(p.count || 0),
        amount: Number(p.total_amount || 0),
        commission: Number(p.total_commission || 0),
      })),
      byType: typeStats.map((t: any) => ({
        type: t.type || "Unknown",
        count: Number(t.count || 0),
        amount: Number(t.total_amount || 0),
        commission: Number(t.total_commission || 0),
      })),
      daily: dailyStats.map((d: any) => ({
        date: d.date,
        count: Number(d.count || 0),
        amount: Number(d.total_amount || 0),
        commission: Number(d.total_commission || 0),
      })),
    };

    console.log("✅ Power statistics fetched successfully:", {
      summary: statistics.summary,
      providerCount: statistics.byProvider.length,
      typeCount: statistics.byType.length,
      dailyCount: statistics.daily.length,
    });

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("❌ Error fetching Power statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Power statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
