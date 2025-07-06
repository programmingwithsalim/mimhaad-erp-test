import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const startDate =
      searchParams.get("startDate") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");

    // Role-based access control
    const isAdmin = userRole === "Admin";
    const isFinance = userRole === "Finance";
    const isManager = userRole === "Manager";
    const isOperations = userRole === "Operations";
    const isCashier = userRole === "Cashier";

    // Determine effective branch filter
    const effectiveBranchId = isAdmin ? null : userBranchId;

    // Get all statistics in parallel with role-based filtering
    const [
      agencyBankingStats,
      momoStats,
      ezwichStats,
      jumiaStats,
      powerStats,
      floatStats,
      commissionStats,
      expenseStats,
      userStats,
      branchStats,
    ] = await Promise.all([
      getAgencyBankingStats(startDate, endDate, effectiveBranchId),
      getMomoStats(startDate, endDate, effectiveBranchId),
      getEzwichStats(startDate, endDate, effectiveBranchId),
      getJumiaStats(startDate, endDate, effectiveBranchId),
      getPowerStats(startDate, endDate, effectiveBranchId),
      getFloatStats(effectiveBranchId),
      getCommissionStats(startDate, endDate, effectiveBranchId),
      getExpenseStats(startDate, endDate, effectiveBranchId),
      getUserStats(effectiveBranchId),
      getBranchStats(isAdmin),
    ]);

    // Calculate totals
    const totalTransactions =
      agencyBankingStats.count +
      momoStats.count +
      ezwichStats.count +
      jumiaStats.count +
      powerStats.count;

    const totalVolume =
      agencyBankingStats.volume +
      momoStats.volume +
      ezwichStats.volume +
      jumiaStats.volume +
      powerStats.volume;

    const totalCommissions = commissionStats.total;
    const totalExpenses = expenseStats.total;

    // Role-specific data filtering
    const responseData: any = {
        overview: {
          totalTransactions,
          totalVolume,
          totalCommissions,
          totalExpenses,
          netRevenue: totalCommissions - totalExpenses,
        },
        services: {
          agencyBanking: agencyBankingStats,
          momo: momoStats,
          ezwich: ezwichStats,
          jumia: jumiaStats,
          power: powerStats,
        },
        float: floatStats,
        commissions: commissionStats,
        expenses: expenseStats,
      chartData: await getChartData(startDate, endDate, effectiveBranchId),
    };

    // Add role-specific data
    if (isAdmin) {
      responseData.users = userStats;
      responseData.branches = branchStats;
      responseData.systemAlerts = await getSystemAlerts();
      responseData.pendingApprovals = await getPendingApprovals();
    }

    if (isFinance) {
      responseData.financialMetrics = await getFinancialMetrics(
        startDate,
        endDate,
        effectiveBranchId
      );
      responseData.revenueAnalysis = await getRevenueAnalysis(
        startDate,
        endDate,
        effectiveBranchId
      );
    }

    if (isManager) {
      responseData.teamPerformance = await getTeamPerformance(
        startDate,
        endDate,
        effectiveBranchId
      );
      responseData.branchMetrics = await getBranchMetrics(effectiveBranchId);
    }

    if (isOperations || isCashier) {
      responseData.dailyOperations = await getDailyOperations(
        startDate,
        endDate,
        effectiveBranchId
      );
      responseData.serviceMetrics = await getServiceMetrics(
        startDate,
        endDate,
        effectiveBranchId
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
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

async function getAgencyBankingStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM agency_banking_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      AND status = 'completed'
      AND (is_reversal IS NULL OR is_reversal = false)
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    };
  } catch (error) {
    console.error("Error fetching agency banking stats:", error);
    return { count: 0, volume: 0, fees: 0 };
  }
}

async function getMomoStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM momo_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      AND (is_reversal IS NULL OR is_reversal = false)
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    };
  } catch (error) {
    console.error("Error fetching momo stats:", error);
    return { count: 0, volume: 0, fees: 0 };
  }
}

async function getEzwichStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM e_zwich_withdrawals 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    };
  } catch (error) {
    console.error("Error fetching E-Zwich stats:", error);
    return { count: 0, volume: 0, fees: 0 };
  }
}

async function getJumiaStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM jumia_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    };
  } catch (error) {
    console.error("Error fetching Jumia stats:", error);
    return { count: 0, volume: 0, fees: 0 };
  }
}

async function getPowerStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM power_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    };
  } catch (error) {
    console.error("Error fetching power stats:", error);
    return { count: 0, volume: 0, fees: 0 };
  }
}

async function getFloatStats(branchId?: string | null) {
  try {
    const branchFilter = branchId ? `WHERE branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(current_balance), 0) as total_balance,
        COALESCE(SUM(CASE WHEN current_balance < min_threshold THEN 1 ELSE 0 END), 0) as low_balance_accounts
      FROM float_accounts
      ${sql.unsafe(branchFilter)}
    `;
    return {
      totalAccounts: Number.parseInt(result[0]?.total_accounts || "0"),
      totalBalance: Number.parseFloat(result[0]?.total_balance || "0"),
      lowBalanceAccounts: Number.parseInt(
        result[0]?.low_balance_accounts || "0"
      ),
    };
  } catch (error) {
    console.error("Error fetching float stats:", error);
    return { totalAccounts: 0, totalBalance: 0, lowBalanceAccounts: 0 };
  }
}

async function getCommissionStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM commissions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      total: Number.parseFloat(result[0]?.total || "0"),
      approved: Number.parseFloat(result[0]?.approved || "0"),
      pending: Number.parseFloat(result[0]?.pending || "0"),
    };
  } catch (error) {
    console.error("Error fetching commission stats:", error);
    return { count: 0, total: 0, approved: 0, pending: 0 };
  }
}

async function getExpenseStats(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    const branchFilter = branchId ? `AND branch_id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM expenses 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
      ${sql.unsafe(branchFilter)}
    `;
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      total: Number.parseFloat(result[0]?.total || "0"),
      approved: Number.parseFloat(result[0]?.approved || "0"),
      pending: Number.parseFloat(result[0]?.pending || "0"),
    };
  } catch (error) {
    console.error("Error fetching expense stats:", error);
    return { count: 0, total: 0, approved: 0, pending: 0 };
  }
}

async function getChartData(
  startDate: string,
  endDate: string,
  branchId?: string
) {
  try {
    // Get daily transaction data for the last 30 days
    const result = await sql`
      WITH date_series AS (
        SELECT generate_series(
          ${startDate}::date,
          ${endDate}::date,
          '1 day'::interval
        )::date as date
      ),
      daily_stats AS (
        SELECT 
          date_trunc('day', created_at)::date as date,
          'agency_banking' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM agency_banking_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        AND (${branchId ? sql`branch_id = ${branchId}` : sql`TRUE`})
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'momo' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM momo_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        AND (${branchId ? sql`branch_id = ${branchId}` : sql`TRUE`})
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'ezwich' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        AND (${branchId ? sql`branch_id = ${branchId}` : sql`TRUE`})
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'jumia' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM jumia_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        AND (${branchId ? sql`branch_id = ${branchId}` : sql`TRUE`})
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'power' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM power_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        AND (${branchId ? sql`branch_id = ${branchId}` : sql`TRUE`})
        GROUP BY date_trunc('day', created_at)::date
      )
      SELECT 
        ds.date,
        COALESCE(SUM(CASE WHEN ds2.service = 'agency_banking' THEN ds2.transactions ELSE 0 END), 0) as agency_banking_transactions,
        COALESCE(SUM(CASE WHEN ds2.service = 'momo' THEN ds2.transactions ELSE 0 END), 0) as momo_transactions,
        COALESCE(SUM(CASE WHEN ds2.service = 'ezwich' THEN ds2.transactions ELSE 0 END), 0) as ezwich_transactions,
        COALESCE(SUM(CASE WHEN ds2.service = 'jumia' THEN ds2.transactions ELSE 0 END), 0) as jumia_transactions,
        COALESCE(SUM(CASE WHEN ds2.service = 'power' THEN ds2.transactions ELSE 0 END), 0) as power_transactions,
        COALESCE(SUM(ds2.volume), 0) as total_volume
      FROM date_series ds
      LEFT JOIN daily_stats ds2 ON ds.date = ds2.date
      GROUP BY ds.date
      ORDER BY ds.date
    `;

    return result.map((row) => ({
      date: row.date,
      agencyBanking: Number.parseInt(row.agency_banking_transactions || "0"),
      momo: Number.parseInt(row.momo_transactions || "0"),
      ezwich: Number.parseInt(row.ezwich_transactions || "0"),
      jumia: Number.parseInt(row.jumia_transactions || "0"),
      power: Number.parseInt(row.power_transactions || "0"),
      totalVolume: Number.parseFloat(row.total_volume || "0"),
    }));
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return [];
  }
}

async function getUserStats(branchId?: string | null) {
  try {
    const branchFilter = branchId
      ? `WHERE primary_branch_id = '${branchId}'`
      : "";
    const result = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as active_users
      FROM users
      ${sql.unsafe(branchFilter)}
    `;
    return {
      totalUsers: Number.parseInt(result[0]?.total_users || "0"),
      activeUsers: Number.parseInt(result[0]?.active_users || "0"),
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { totalUsers: 0, activeUsers: 0 };
  }
}

async function getBranchStats(isAdmin: boolean) {
  if (!isAdmin) return { totalBranches: 0, activeBranches: 0 };

  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_branches,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches
      FROM branches
    `;
    return {
      totalBranches: Number.parseInt(result[0]?.total_branches || "0"),
      activeBranches: Number.parseInt(result[0]?.active_branches || "0"),
    };
  } catch (error) {
    console.error("Error fetching branch stats:", error);
    return { totalBranches: 0, activeBranches: 0 };
  }
}

async function getSystemAlerts() {
  try {
    const result = await sql`
      SELECT COUNT(*) as alert_count
      FROM notifications
      WHERE status = 'unread'
    `;
    return Number.parseInt(result[0]?.alert_count || "0");
  } catch (error) {
    console.error("Error fetching system alerts:", error);
    return 0;
  }
}

async function getPendingApprovals() {
  try {
    const result = await sql`
      SELECT COUNT(*) as pending_count
      FROM expenses
      WHERE status = 'pending'
    `;
    return Number.parseInt(result[0]?.pending_count || "0");
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return 0;
  }
}

async function getFinancialMetrics(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    // Branch filter for each table
    const agencyBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const momoBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const ezwichBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const jumiaBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const powerBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const expenseBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    // Revenue: sum of all completed transaction amounts
    const [agency, momo, ezwich, jumia, power, expenses] = await Promise.all([
      sql`SELECT COALESCE(SUM(amount),0) as revenue FROM agency_banking_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${agencyBranch}`,
      sql`SELECT COALESCE(SUM(amount),0) as revenue FROM momo_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${momoBranch}`,
      sql`SELECT COALESCE(SUM(amount),0) as revenue FROM e_zwich_withdrawals WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${ezwichBranch}`,
      sql`SELECT COALESCE(SUM(amount),0) as revenue FROM jumia_transactions WHERE status = 'active' AND created_at BETWEEN ${startDate} AND ${endDate} ${jumiaBranch}`,
      sql`SELECT COALESCE(SUM(amount),0) as revenue FROM power_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${powerBranch}`,
      sql`SELECT COALESCE(SUM(amount),0) as expenses FROM expenses WHERE status = 'approved' AND created_at BETWEEN ${startDate} AND ${endDate} ${expenseBranch}`,
    ]);

    const totalRevenue =
      parseFloat(agency[0].revenue || 0) +
      parseFloat(momo[0].revenue || 0) +
      parseFloat(ezwich[0].revenue || 0) +
      parseFloat(jumia[0].revenue || 0) +
      parseFloat(power[0].revenue || 0);
    const totalExpenses = parseFloat(expenses[0].expenses || 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
    };
  } catch (error) {
    console.error("Error fetching financial metrics:", error);
    return { totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
  }
}

async function getRevenueAnalysis(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    // Branch filter for each table
    const agencyBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const momoBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const ezwichBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const jumiaBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const powerBranch = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    // Query each service type separately for performance
    const [agency, momo, ezwich, jumia, power] = await Promise.all([
      sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as revenue FROM agency_banking_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${agencyBranch}`,
      sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as revenue FROM momo_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${momoBranch}`,
      sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as revenue FROM e_zwich_withdrawals WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${ezwichBranch}`,
      sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as revenue FROM jumia_transactions WHERE status = 'active' AND created_at BETWEEN ${startDate} AND ${endDate} ${jumiaBranch}`,
      sql`SELECT COUNT(*) as transactions, COALESCE(SUM(amount),0) as revenue FROM power_transactions WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${powerBranch}`,
    ]);

    return [
      {
        service: "agency_banking",
        transactions: parseInt(agency[0].transactions || 0),
        revenue: parseFloat(agency[0].revenue || 0),
      },
      {
        service: "momo",
        transactions: parseInt(momo[0].transactions || 0),
        revenue: parseFloat(momo[0].revenue || 0),
      },
      {
        service: "ezwich",
        transactions: parseInt(ezwich[0].transactions || 0),
        revenue: parseFloat(ezwich[0].revenue || 0),
      },
      {
        service: "jumia",
        transactions: parseInt(jumia[0].transactions || 0),
        revenue: parseFloat(jumia[0].revenue || 0),
      },
      {
        service: "power",
        transactions: parseInt(power[0].transactions || 0),
        revenue: parseFloat(power[0].revenue || 0),
      },
    ];
  } catch (error) {
    console.error("Error fetching revenue analysis:", error);
    return [];
  }
}

async function getTeamPerformance(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    // For each transaction table, get user_id, user name, count, and volume
    const branchAgency = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchMomo = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchEzwich = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchJumia = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchPower = branchId ? sql`AND branch_id = ${branchId}` : sql``;

    // Agency Banking
    const agency = await sql`
      SELECT user_id, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM agency_banking_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${branchAgency}
      GROUP BY user_id
    `;
    // Momo
    const momo = await sql`
      SELECT user_id, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM momo_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${branchMomo}
      GROUP BY user_id
    `;
    // Ezwich
    const ezwich = await sql`
      SELECT user_id, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM e_zwich_withdrawals
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${branchEzwich}
      GROUP BY user_id
    `;
    // Jumia
    const jumia = await sql`
      SELECT user_id, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM jumia_transactions
      WHERE status = 'active' AND created_at BETWEEN ${startDate} AND ${endDate} ${branchJumia}
      GROUP BY user_id
    `;
    // Power
    const power = await sql`
      SELECT user_id, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM power_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} ${branchPower}
      GROUP BY user_id
    `;
    // Merge all results by user_id
    const userMap = new Map();
    const addToMap = (rows) => {
      for (const row of rows) {
        if (!row.user_id) continue;
        if (!userMap.has(row.user_id)) {
          userMap.set(row.user_id, {
            user_id: row.user_id,
            transactions: 0,
            volume: 0,
          });
        }
        const u = userMap.get(row.user_id);
        u.transactions += parseInt(row.transactions || 0);
        u.volume += parseFloat(row.volume || 0);
      }
    };
    [agency, momo, ezwich, jumia, power].forEach(addToMap);
    // Get user names
    const userIds = Array.from(userMap.keys());
    let names = [];
    if (userIds.length > 0) {
      names =
        await sql`SELECT id, CONCAT(first_name, ' ', last_name) as name FROM users WHERE id IN (${userIds})`;
    }
    const nameMap = new Map(names.map((u) => [u.id, u.name]));
    // Build result
    const result = Array.from(userMap.values()).map((u) => ({
      name: nameMap.get(u.user_id) || "Unknown",
      transactions: u.transactions,
      volume: u.volume,
    }));
    // Sort by volume desc, limit 10
    return result.sort((a, b) => b.volume - a.volume).slice(0, 10);
  } catch (error) {
    console.error("Error fetching team performance:", error);
    return [];
  }
}

async function getBranchMetrics(branchId?: string | null) {
  try {
    const branchFilter = branchId ? `WHERE id = '${branchId}'` : "";
    const result = await sql`
      SELECT 
        name,
        location,
        status,
        created_at
      FROM branches
      ${sql.unsafe(branchFilter)}
    `;
    return result.map((row: any) => ({
      name: row.name,
      location: row.location,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error fetching branch metrics:", error);
    return [];
  }
}

async function getDailyOperations(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    // For each transaction table, get daily count and volume
    const branchAgency = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchMomo = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchEzwich = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchJumia = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchPower = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    // Agency
    const agency = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM agency_banking_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchAgency}
      GROUP BY DATE(created_at)
    `;
    // Momo
    const momo = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM momo_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchMomo}
      GROUP BY DATE(created_at)
    `;
    // Ezwich
    const ezwich = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM e_zwich_withdrawals
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchEzwich}
      GROUP BY DATE(created_at)
    `;
    // Jumia
    const jumia = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM jumia_transactions
      WHERE status = 'active' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchJumia}
      GROUP BY DATE(created_at)
    `;
    // Power
    const power = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as transactions, COALESCE(SUM(amount),0) as volume
      FROM power_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchPower}
      GROUP BY DATE(created_at)
    `;
    // Merge by date
    const dateMap = new Map();
    const addToMap = (rows) => {
      for (const row of rows) {
        if (!row.date) continue;
        const key = row.date.toISOString().slice(0, 10);
        if (!dateMap.has(key)) {
          dateMap.set(key, { date: key, transactions: 0, volume: 0 });
        }
        const d = dateMap.get(key);
        d.transactions += parseInt(row.transactions || 0);
        d.volume += parseFloat(row.volume || 0);
      }
    };
    [agency, momo, ezwich, jumia, power].forEach(addToMap);
    // Sort by date desc, limit 7
    return Array.from(dateMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  } catch (error) {
    console.error("Error fetching daily operations:", error);
    return [];
  }
}

async function getServiceMetrics(
  startDate: string,
  endDate: string,
  branchId?: string | null
) {
  try {
    // For each transaction table, get count, volume, avg_amount
    const branchAgency = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchMomo = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchEzwich = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchJumia = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    const branchPower = branchId ? sql`AND branch_id = ${branchId}` : sql``;
    // Agency
    const agency = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as volume, COALESCE(AVG(amount),0) as avg_amount
      FROM agency_banking_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchAgency}
    `;
    // Momo
    const momo = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as volume, COALESCE(AVG(amount),0) as avg_amount
      FROM momo_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchMomo}
    `;
    // Ezwich
    const ezwich = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as volume, COALESCE(AVG(amount),0) as avg_amount
      FROM e_zwich_withdrawals
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchEzwich}
    `;
    // Jumia
    const jumia = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as volume, COALESCE(AVG(amount),0) as avg_amount
      FROM jumia_transactions
      WHERE status = 'active' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchJumia}
    `;
    // Power
    const power = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as volume, COALESCE(AVG(amount),0) as avg_amount
      FROM power_transactions
      WHERE status = 'completed' AND created_at BETWEEN ${startDate} AND ${endDate} 
      AND (is_reversal IS NULL OR is_reversal = false) ${branchPower}
    `;
    return [
      {
        service: "agency_banking",
        count: parseInt(agency[0].count || 0),
        volume: parseFloat(agency[0].volume || 0),
        avgAmount: parseFloat(agency[0].avg_amount || 0),
      },
      {
        service: "momo",
        count: parseInt(momo[0].count || 0),
        volume: parseFloat(momo[0].volume || 0),
        avgAmount: parseFloat(momo[0].avg_amount || 0),
      },
      {
        service: "ezwich",
        count: parseInt(ezwich[0].count || 0),
        volume: parseFloat(ezwich[0].volume || 0),
        avgAmount: parseFloat(ezwich[0].avg_amount || 0),
      },
      {
        service: "jumia",
        count: parseInt(jumia[0].count || 0),
        volume: parseFloat(jumia[0].volume || 0),
        avgAmount: parseFloat(jumia[0].avg_amount || 0),
      },
      {
        service: "power",
        count: parseInt(power[0].count || 0),
        volume: parseFloat(power[0].volume || 0),
        avgAmount: parseFloat(power[0].avg_amount || 0),
      },
    ];
  } catch (error) {
    console.error("Error fetching service metrics:", error);
    return [];
  }
}
