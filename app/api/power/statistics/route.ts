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

    // Get transaction statistics with proper parameterized queries
    let statsResult;
    if (branchId && branchId !== "all") {
      statsResult = await sql`
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
        WHERE branch_id = ${branchId}
        AND (is_reversal IS NULL OR is_reversal = false)
      `;
    } else {
      statsResult = await sql`
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
        WHERE (is_reversal IS NULL OR is_reversal = false)
      `;
    }

    const stats = statsResult[0] || {};

    // Get provider breakdown
    let providerStats;
    if (branchId && branchId !== "all") {
      providerStats = await sql`
        SELECT 
          provider,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE branch_id = ${branchId}
        AND (is_reversal IS NULL OR is_reversal = false)
        GROUP BY provider
        ORDER BY total_amount DESC
      `;
    } else {
      providerStats = await sql`
        SELECT 
          provider,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE (is_reversal IS NULL OR is_reversal = false)
        GROUP BY provider
        ORDER BY total_amount DESC
      `;
    }

    // Get daily breakdown for the last 30 days
    let dailyStats;
    if (branchId && branchId !== "all") {
      dailyStats = await sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND branch_id = ${branchId}
        AND (is_reversal IS NULL OR is_reversal = false)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
    } else {
      dailyStats = await sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND (is_reversal IS NULL OR is_reversal = false)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
    }

    // Get transaction type breakdown
    let typeStats;
    if (branchId && branchId !== "all") {
      typeStats = await sql`
        SELECT 
          type,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE branch_id = ${branchId}
        AND (is_reversal IS NULL OR is_reversal = false)
        GROUP BY type
        ORDER BY total_amount DESC
      `;
    } else {
      typeStats = await sql`
        SELECT 
          type,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission
        FROM power_transactions
        WHERE (is_reversal IS NULL OR is_reversal = false)
        GROUP BY type
        ORDER BY total_amount DESC
      `;
    }

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
