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

    console.log("📊 Fetching MoMo statistics with filters:", {
      branchId,
      dateFrom,
      dateTo,
      provider,
    });

    // Build WHERE clause and parameters
    let whereParts: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    if (branchId && branchId !== "all") {
      whereParts.push(`branch_id = $${paramIndex++}`);
      params.push(branchId);
    }
    if (dateFrom) {
      whereParts.push(`date >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      whereParts.push(`date <= $${paramIndex++}`);
      params.push(dateTo);
    }
    if (provider && provider !== "all") {
      whereParts.push(`provider = $${paramIndex++}`);
      params.push(provider);
    }
    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    // Get transaction statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee), 0) as total_fees,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount
      FROM momo_transactions
      ${whereClause}
    `;
    const statsResult = await sql.query(statsQuery, params);
    const stats = statsResult.rows?.[0] || {};

    // Get provider breakdown
    const providerQuery = `
      SELECT 
        provider,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee), 0) as total_fees
      FROM momo_transactions
      ${whereClause}
      GROUP BY provider
      ORDER BY total_amount DESC
    `;
    const providerStats = await sql.query(providerQuery, params);

    // Get daily breakdown for the last 30 days
    let dailyWhere = `WHERE date >= CURRENT_DATE - INTERVAL '30 days'`;
    let dailyParams: any[] = [];
    let dailyParamIndex = 1;
    if (branchId && branchId !== "all") {
      dailyWhere += ` AND branch_id = $${dailyParamIndex++}`;
      dailyParams.push(branchId);
    }
    if (provider && provider !== "all") {
      dailyWhere += ` AND provider = $${dailyParamIndex++}`;
      dailyParams.push(provider);
    }
    const dailyQuery = `
      SELECT 
        DATE(date) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee), 0) as total_fees
      FROM momo_transactions
      ${dailyWhere}
      GROUP BY DATE(date)
      ORDER BY date DESC
    `;
    const dailyStats = await sql.query(dailyQuery, dailyParams);

    // Get transaction type breakdown
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee), 0) as total_fees
      FROM momo_transactions
      ${whereClause}
      GROUP BY type
      ORDER BY total_amount DESC
    `;
    const typeStats = await sql.query(typeQuery, params);

    const statistics = {
      summary: {
        totalCount: Number(stats.total_count || 0),
        totalAmount: Number(stats.total_amount || 0),
        totalFees: Number(stats.total_fees || 0),
        completedCount: Number(stats.completed_count || 0),
        completedAmount: Number(stats.completed_amount || 0),
        pendingCount: Number(stats.pending_count || 0),
        pendingAmount: Number(stats.pending_amount || 0),
        failedCount: Number(stats.failed_count || 0),
        failedAmount: Number(stats.failed_amount || 0),
      },
      byProvider: providerStats.rows.map((p: any) => ({
        provider: p.provider || "Unknown",
        count: Number(p.count || 0),
        amount: Number(p.total_amount || 0),
        fees: Number(p.total_fees || 0),
      })),
      byType: typeStats.rows.map((t: any) => ({
        type: t.type || "Unknown",
        count: Number(t.count || 0),
        amount: Number(t.total_amount || 0),
        fees: Number(t.total_fees || 0),
      })),
      daily: dailyStats.rows.map((d: any) => ({
        date: d.date,
        count: Number(d.count || 0),
        amount: Number(d.total_amount || 0),
        fees: Number(d.total_fees || 0),
      })),
    };

    console.log("✅ MoMo statistics fetched successfully");

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("❌ Error fetching MoMo statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
