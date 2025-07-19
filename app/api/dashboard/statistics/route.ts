import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");

    // Determine effective branch filter based on user role
    const isAdmin = userRole === "Admin";
    const effectiveBranchId = isAdmin ? null : userBranchId;
    const branchFilter = effectiveBranchId
      ? sql`AND branch_id = ${effectiveBranchId}`
      : sql``;

    // Get today's date for filtering
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Total branches (only for admin)
    const branchRes = isAdmin
      ? await sql`SELECT COUNT(*) AS total FROM branches WHERE status = 'active'`
      : [{ total: 1 }];
    const totalBranches = Number(branchRes[0]?.total || 0);

    // Total users (filtered by branch for non-admin)
    const userRes =
      await sql`SELECT COUNT(*) AS total FROM users WHERE status = 'active' ${branchFilter}`;
    const totalUsers = Number(userRes[0]?.total || 0);

    // Today's MoMo transactions
    const momoTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM momo_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayMomoTransactions = Number(momoTodayRes[0]?.total || 0);
    const todayMomoVolume = Number(momoTodayRes[0]?.volume || 0);

    // Total MoMo transactions
    const momoRes =
      await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM momo_transactions WHERE status = 'completed' ${branchFilter}`;
    const totalMomoTransactions = Number(momoRes[0]?.total || 0);
    const totalMomoVolume = Number(momoRes[0]?.volume || 0);

    // Today's Agency Banking transactions
    const agencyTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM agency_banking_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayAgencyTransactions = Number(agencyTodayRes[0]?.total || 0);
    const todayAgencyVolume = Number(agencyTodayRes[0]?.volume || 0);

    // Total Agency Banking transactions
    const agencyRes =
      await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM agency_banking_transactions WHERE status = 'completed' ${branchFilter}`;
    const totalAgencyTransactions = Number(agencyRes[0]?.total || 0);
    const totalAgencyVolume = Number(agencyRes[0]?.volume || 0);

    // Today's E-Zwich withdrawals
    const ezwichTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM e_zwich_withdrawals 
      WHERE status = 'completed' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayEzwichTransactions = Number(ezwichTodayRes[0]?.total || 0);
    const todayEzwichVolume = Number(ezwichTodayRes[0]?.volume || 0);

    // Total E-Zwich withdrawals
    const ezwichRes =
      await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM e_zwich_withdrawals WHERE status = 'completed' ${branchFilter}`;
    const totalEzwichTransactions = Number(ezwichRes[0]?.total || 0);
    const totalEzwichVolume = Number(ezwichRes[0]?.volume || 0);

    // Today's Power transactions
    const powerTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM power_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayPowerTransactions = Number(powerTodayRes[0]?.total || 0);
    const todayPowerVolume = Number(powerTodayRes[0]?.volume || 0);

    // Total Power transactions
    const powerRes =
      await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM power_transactions WHERE status = 'completed' ${branchFilter}`;
    const totalPowerTransactions = Number(powerRes[0]?.total || 0);
    const totalPowerVolume = Number(powerRes[0]?.volume || 0);

    // Today's Jumia transactions
    const jumiaTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM jumia_transactions 
      WHERE status = 'active' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayJumiaTransactions = Number(jumiaTodayRes[0]?.total || 0);
    const todayJumiaVolume = Number(jumiaTodayRes[0]?.volume || 0);

    // Total Jumia transactions
    const jumiaRes =
      await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM jumia_transactions WHERE status = 'active' ${branchFilter}`;
    const totalJumiaTransactions = Number(jumiaRes[0]?.total || 0);
    const totalJumiaVolume = Number(jumiaRes[0]?.volume || 0);

    // Today's commissions
    const commissionTodayRes = await sql`
      SELECT COALESCE(SUM(amount),0) AS total 
      FROM commissions 
      WHERE status = 'approved' AND DATE(created_at) = ${today} ${branchFilter}
    `;
    const todayCommissions = Number(commissionTodayRes[0]?.total || 0);

    // Total commissions
    const commissionRes =
      await sql`SELECT COALESCE(SUM(amount),0) AS total FROM commissions WHERE status = 'approved' ${branchFilter}`;
    const totalCommissions = Number(commissionRes[0]?.total || 0);

    // Active users (filtered by branch for non-admin)
    const activeUserRes =
      await sql`SELECT COUNT(*) AS total FROM users WHERE status = 'active' ${branchFilter}`;
    const activeUsers = Number(activeUserRes[0]?.total || 0);

    // Pending approvals (commissions)
    const pendingRes =
      await sql`SELECT COUNT(*) AS total FROM commissions WHERE status = 'pending' ${branchFilter}`;
    const pendingApprovals = Number(pendingRes[0]?.total || 0);

    // Float alerts - accounts below threshold (filtered by branch for non-admin)
    const floatAlertsRes = await sql`
      SELECT 
        id,
        account_type as provider,
        account_type as service,
        current_balance,
        min_threshold as threshold,
        CASE 
          WHEN current_balance <= min_threshold * 0.5 THEN 'critical'
          ELSE 'warning'
        END as severity
      FROM float_accounts 
      WHERE current_balance <= min_threshold AND is_active = true ${branchFilter}
    `;
    const floatAlerts = floatAlertsRes.map((row: any) => ({
      id: row.id,
      provider: row.provider,
      service: row.service,
      current_balance: Number(row.current_balance),
      threshold: Number(row.threshold),
      severity: row.severity,
    }));

    // Recent activity with better structure (filtered by branch for non-admin)
    const activityRes = await sql`
      SELECT 
        id, 
        action_type, 
        description, 
        username, 
        created_at, 
        status,
        entity_type,
        entity_id
      FROM audit_logs 
      WHERE 1=1 ${branchFilter}
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const recentActivity = activityRes.map((row: any) => ({
      id: row.id,
      type: row.action_type,
      service: row.entity_type || "system",
      amount: 0, // Will be calculated if needed
      timestamp: row.created_at,
      user: row.username,
      description: row.description,
      status: row.status,
    }));

    // Branch stats (only for admin, or single branch for non-admin)
    const branchStatsRes = isAdmin
      ? await sql`SELECT id, name, code, region, status FROM branches`
      : await sql`SELECT id, name, code, region, status FROM branches WHERE id = ${userBranchId}`;
    const branchStats = branchStatsRes;

    // Daily breakdown for the last 7 days (filtered by branch for non-admin)
    const dailyBreakdownRes = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume
      FROM (
        SELECT created_at, amount FROM momo_transactions WHERE status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount FROM agency_banking_transactions WHERE status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount FROM e_zwich_withdrawals WHERE status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount FROM power_transactions WHERE status = 'completed' ${branchFilter}
        UNION ALL
        SELECT created_at, amount FROM jumia_transactions WHERE status = 'active' ${branchFilter}
      ) combined_transactions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    const dailyBreakdown = dailyBreakdownRes.map((row: any) => ({
      date: row.date,
      transactions: Number(row.transactions),
      volume: Number(row.volume),
      commission: Number(row.volume) * 0.05, // 5% commission estimate
    }));

    // Service stats with today's and total metrics
    const serviceStats = [
      {
        service: "MoMo",
        todayTransactions: todayMomoTransactions,
        todayVolume: todayMomoVolume,
        todayFees: todayMomoVolume * 0.01, // 1% fee estimate
        totalTransactions: totalMomoTransactions,
        totalVolume: totalMomoVolume,
        totalFees: totalMomoVolume * 0.01,
      },
      {
        service: "Agency Banking",
        todayTransactions: todayAgencyTransactions,
        todayVolume: todayAgencyVolume,
        todayFees: todayAgencyVolume * 0.005, // 0.5% fee estimate
        totalTransactions: totalAgencyTransactions,
        totalVolume: totalAgencyVolume,
        totalFees: totalAgencyVolume * 0.005,
      },
      {
        service: "E-Zwich",
        todayTransactions: todayEzwichTransactions,
        todayVolume: todayEzwichVolume,
        todayFees: todayEzwichVolume * 0.01, // 1% fee estimate
        totalTransactions: totalEzwichTransactions,
        totalVolume: totalEzwichVolume,
        totalFees: totalEzwichVolume * 0.01,
      },
      {
        service: "Power",
        todayTransactions: todayPowerTransactions,
        todayVolume: todayPowerVolume,
        todayFees: todayPowerVolume * 0.02, // 2% commission estimate
        totalTransactions: totalPowerTransactions,
        totalVolume: totalPowerVolume,
        totalFees: totalPowerVolume * 0.02,
      },
      {
        service: "Jumia",
        todayTransactions: todayJumiaTransactions,
        todayVolume: todayJumiaVolume,
        todayFees: todayJumiaVolume * 0.01, // 1% fee estimate
        totalTransactions: totalJumiaTransactions,
        totalVolume: totalJumiaVolume,
        totalFees: totalJumiaVolume * 0.01,
      },
    ];

    // Calculate totals
    const todayTransactions =
      todayMomoTransactions +
      todayAgencyTransactions +
      todayEzwichTransactions +
      todayPowerTransactions +
      todayJumiaTransactions;
    const todayVolume =
      todayMomoVolume +
      todayAgencyVolume +
      todayEzwichVolume +
      todayPowerVolume +
      todayJumiaVolume;
    const todayCommission = todayCommissions;
    const totalTransactions =
      totalMomoTransactions +
      totalAgencyTransactions +
      totalEzwichTransactions +
      totalPowerTransactions +
      totalJumiaTransactions;
    const totalVolume =
      totalMomoVolume +
      totalAgencyVolume +
      totalEzwichVolume +
      totalPowerVolume +
      totalJumiaVolume;

    // Financial metrics
    const financialMetrics = {
      totalRevenue: totalVolume * 0.01, // 1% average revenue
      totalExpenses: totalVolume * 0.005, // 0.5% average expenses
      netIncome: totalVolume * 0.01 - totalVolume * 0.005,
      profitMargin:
        totalVolume > 0
          ? ((totalVolume * 0.01 - totalVolume * 0.005) /
              (totalVolume * 0.01)) *
            100
          : 0,
    };

    // System alerts (filtered by branch for non-admin)
    const systemAlerts = floatAlerts.length;

    return NextResponse.json({
      success: true,
      data: {
        totalTransactions,
        totalVolume,
        totalCommissions,
        activeUsers,
        todayTransactions,
        todayVolume,
        todayCommission,
        serviceStats,
        recentActivity,
        floatAlerts,
        dailyBreakdown,
        financialMetrics,
        systemAlerts,
        pendingApprovals,
        users: {
          totalUsers,
          activeUsers,
        },
        branchStats,
        totalBranches,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
