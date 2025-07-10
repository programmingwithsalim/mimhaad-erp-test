import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userBranchId = searchParams.get('userBranchId');

    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Total branches
    const branchRes = await sql`SELECT COUNT(*) AS total FROM branches WHERE status = 'active'`;
    const totalBranches = Number(branchRes[0]?.total || 0);

    // Total users
    const userRes = await sql`SELECT COUNT(*) AS total FROM users WHERE status = 'active'`;
    const totalUsers = Number(userRes[0]?.total || 0);

    // Today's MoMo transactions
    const momoTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM momo_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today}
    `;
    const todayMomoTransactions = Number(momoTodayRes[0]?.total || 0);
    const todayMomoVolume = Number(momoTodayRes[0]?.volume || 0);

    // Total MoMo transactions
    const momoRes = await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM momo_transactions WHERE status = 'completed'`;
    const totalMomoTransactions = Number(momoRes[0]?.total || 0);
    const totalMomoVolume = Number(momoRes[0]?.volume || 0);

    // Today's Agency Banking transactions
    const agencyTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM agency_banking_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today}
    `;
    const todayAgencyTransactions = Number(agencyTodayRes[0]?.total || 0);
    const todayAgencyVolume = Number(agencyTodayRes[0]?.volume || 0);

    // Total Agency Banking transactions
    const agencyRes = await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM agency_banking_transactions WHERE status = 'completed'`;
    const totalAgencyTransactions = Number(agencyRes[0]?.total || 0);
    const totalAgencyVolume = Number(agencyRes[0]?.volume || 0);

    // Today's E-Zwich withdrawals
    const ezwichTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM e_zwich_withdrawals 
      WHERE status = 'completed' AND DATE(created_at) = ${today}
    `;
    const todayEzwichTransactions = Number(ezwichTodayRes[0]?.total || 0);
    const todayEzwichVolume = Number(ezwichTodayRes[0]?.volume || 0);

    // Total E-Zwich withdrawals
    const ezwichRes = await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM e_zwich_withdrawals WHERE status = 'completed'`;
    const totalEzwichTransactions = Number(ezwichRes[0]?.total || 0);
    const totalEzwichVolume = Number(ezwichRes[0]?.volume || 0);

    // Today's Power transactions
    const powerTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM power_transactions 
      WHERE status = 'completed' AND DATE(created_at) = ${today}
    `;
    const todayPowerTransactions = Number(powerTodayRes[0]?.total || 0);
    const todayPowerVolume = Number(powerTodayRes[0]?.volume || 0);

    // Total Power transactions
    const powerRes = await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM power_transactions WHERE status = 'completed'`;
    const totalPowerTransactions = Number(powerRes[0]?.total || 0);
    const totalPowerVolume = Number(powerRes[0]?.volume || 0);

    // Today's Jumia transactions
    const jumiaTodayRes = await sql`
      SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume 
      FROM jumia_transactions 
      WHERE status = 'active' AND DATE(created_at) = ${today}
    `;
    const todayJumiaTransactions = Number(jumiaTodayRes[0]?.total || 0);
    const todayJumiaVolume = Number(jumiaTodayRes[0]?.volume || 0);

    // Total Jumia transactions
    const jumiaRes = await sql`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM jumia_transactions WHERE status = 'active'`;
    const totalJumiaTransactions = Number(jumiaRes[0]?.total || 0);
    const totalJumiaVolume = Number(jumiaRes[0]?.volume || 0);

    // Today's commissions
    const commissionTodayRes = await sql`
      SELECT COALESCE(SUM(amount),0) AS total 
      FROM commissions 
      WHERE status = 'approved' AND DATE(created_at) = ${today}
    `;
    const todayCommissions = Number(commissionTodayRes[0]?.total || 0);

    // Total commissions
    const commissionRes = await sql`SELECT COALESCE(SUM(amount),0) AS total FROM commissions WHERE status = 'approved'`;
    const totalCommissions = Number(commissionRes[0]?.total || 0);

    // Active users
    const activeUserRes = await sql`SELECT COUNT(*) AS total FROM users WHERE status = 'active'`;
    const activeUsers = Number(activeUserRes[0]?.total || 0);

    // Pending approvals (commissions)
    const pendingRes = await sql`SELECT COUNT(*) AS total FROM commissions WHERE status = 'pending'`;
    const pendingApprovals = Number(pendingRes[0]?.total || 0);

    // Float alerts - accounts below threshold
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
      WHERE current_balance <= min_threshold AND is_active = true
    `;
    const floatAlerts = floatAlertsRes.map((row: any) => ({
      id: row.id,
      provider: row.provider,
      service: row.service,
      current_balance: Number(row.current_balance),
      threshold: Number(row.threshold),
      severity: row.severity,
    }));

    // Recent activity with better structure
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
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const recentActivity = activityRes.map((row: any) => ({
      id: row.id,
      type: row.action_type,
      service: row.entity_type || 'system',
      amount: 0, // Will be calculated if needed
      timestamp: row.created_at,
      user: row.username,
      description: row.description,
      status: row.status,
    }));

    // Branch stats
    const branchStatsRes = await sql`SELECT id, name, code, region, status FROM branches`;
    const branchStats = branchStatsRes;

    // Daily breakdown for the last 7 days
    const dailyBreakdownRes = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as volume
      FROM (
        SELECT created_at, amount FROM momo_transactions WHERE status = 'completed'
        UNION ALL
        SELECT created_at, amount FROM agency_banking_transactions WHERE status = 'completed'
        UNION ALL
        SELECT created_at, amount FROM e_zwich_withdrawals WHERE status = 'completed'
        UNION ALL
        SELECT created_at, amount FROM power_transactions WHERE status = 'completed'
        UNION ALL
        SELECT created_at, amount FROM jumia_transactions WHERE status = 'active'
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
        totalTransactions: totalMomoTransactions, 
        totalVolume: totalMomoVolume,
        todayFees: todayMomoVolume * 0.02, // 2% fee estimate
        totalBalance: 0, // Will be calculated from float accounts
        weeklyGrowth: 0, // Will be calculated
        monthlyGrowth: 0 // Will be calculated
      },
      { 
        service: "Agency Banking", 
        todayTransactions: todayAgencyTransactions,
        todayVolume: todayAgencyVolume,
        totalTransactions: totalAgencyTransactions, 
        totalVolume: totalAgencyVolume,
        todayFees: todayAgencyVolume * 0.01, // 1% fee estimate
        totalBalance: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0
      },
      { 
        service: "E-Zwich", 
        todayTransactions: todayEzwichTransactions,
        todayVolume: todayEzwichVolume,
        totalTransactions: totalEzwichTransactions, 
        totalVolume: totalEzwichVolume,
        todayFees: todayEzwichVolume * 0.015, // 1.5% fee estimate
        totalBalance: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0
      },
      { 
        service: "Power", 
        todayTransactions: todayPowerTransactions,
        todayVolume: todayPowerVolume,
        totalTransactions: totalPowerTransactions, 
        totalVolume: totalPowerVolume,
        todayFees: todayPowerVolume * 0.03, // 3% fee estimate
        totalBalance: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0
      },
      { 
        service: "Jumia", 
        todayTransactions: todayJumiaTransactions,
        todayVolume: todayJumiaVolume,
        totalTransactions: totalJumiaTransactions, 
        totalVolume: totalJumiaVolume,
        todayFees: todayJumiaVolume * 0.025, // 2.5% fee estimate
        totalBalance: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0
      },
    ];

    // Calculate totals
    const todayTransactions = serviceStats.reduce((sum, service) => sum + service.todayTransactions, 0);
    const todayVolume = serviceStats.reduce((sum, service) => sum + service.todayVolume, 0);
    const todayFees = serviceStats.reduce((sum, service) => sum + service.todayFees, 0);
    const totalTransactions = serviceStats.reduce((sum, service) => sum + service.totalTransactions, 0);
    const totalVolume = serviceStats.reduce((sum, service) => sum + service.totalVolume, 0);

    // System alerts count
    const systemAlerts = floatAlerts.length + pendingApprovals;

    return NextResponse.json({
      // Basic stats
      totalBranches,
      totalUsers,
      totalCommissions,
      activeUsers,
      pendingApprovals,
      systemAlerts,
      
      // Today's metrics
      todayTransactions,
      todayVolume,
      todayCommission: todayFees,
      
      // Total metrics
      totalTransactions,
      totalVolume,
      
      // Detailed data
      recentActivity,
      branchStats,
      serviceStats,
      floatAlerts,
      dailyBreakdown,
      
      // User stats
      users: {
        totalUsers,
        activeUsers,
      },
      
      // Financial metrics
      financialMetrics: {
        totalRevenue: totalVolume,
        totalCommission: totalCommissions,
        todayRevenue: todayVolume,
        todayCommission: todayFees,
        averageTransactionValue: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}
