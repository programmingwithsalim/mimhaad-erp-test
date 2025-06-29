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

    // Build WHERE conditions
    const conditions = [];
    const params = [];

    if (branchId && branchId !== "all") {
      conditions.push("branch_id = $1");
      params.push(branchId);
    }

    if (dateFrom) {
      conditions.push("created_at >= $2");
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push("created_at <= $3");
      params.push(dateTo);
    }

    if (provider && provider !== "all") {
      conditions.push("provider = $4");
      params.push(provider);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount
      FROM power_transactions
      ${whereClause}
    `;

    const statsResult = await sql.unsafe(statsQuery, params);
    const stats = statsResult[0] || {};

    // Get provider breakdown
    const providerStats = await sql`
      SELECT 
        provider,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      GROUP BY provider
      ORDER BY total_amount DESC
    `;

    // Get daily breakdown for the last 30 days
    const dailyStats = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ${
        branchId && branchId !== "all"
          ? sql`AND branch_id = ${branchId}`
          : sql``
      }
      ${
        provider && provider !== "all" ? sql`AND provider = ${provider}` : sql``
      }
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get transaction type breakdown
    const typeStats = await sql`
      SELECT 
        type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(commission), 0) as total_commission
      FROM power_transactions
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      GROUP BY type
      ORDER BY total_amount DESC
    `;

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

    console.log("✅ Power statistics fetched successfully");

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
