import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    // Get date range from query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get("endDate") || new Date().toISOString()

    // Get all statistics in parallel
    const [
      agencyBankingStats,
      momoStats,
      ezwichStats,
      jumiaStats,
      powerStats,
      floatStats,
      commissionStats,
      expenseStats,
    ] = await Promise.all([
      getAgencyBankingStats(startDate, endDate),
      getMomoStats(startDate, endDate),
      getEzwichStats(startDate, endDate),
      getJumiaStats(startDate, endDate),
      getPowerStats(startDate, endDate),
      getFloatStats(),
      getCommissionStats(startDate, endDate),
      getExpenseStats(startDate, endDate),
    ])

    // Calculate totals
    const totalTransactions =
      agencyBankingStats.count + momoStats.count + ezwichStats.count + jumiaStats.count + powerStats.count

    const totalVolume =
      agencyBankingStats.volume + momoStats.volume + ezwichStats.volume + jumiaStats.volume + powerStats.volume

    const totalCommissions = commissionStats.total
    const totalExpenses = expenseStats.total

    return NextResponse.json({
      success: true,
      data: {
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
        chartData: await getChartData(startDate, endDate),
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function getAgencyBankingStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM agency_banking_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    }
  } catch (error) {
    console.error("Error fetching agency banking stats:", error)
    return { count: 0, volume: 0, fees: 0 }
  }
}

async function getMomoStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM momo_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    }
  } catch (error) {
    console.error("Error fetching momo stats:", error)
    return { count: 0, volume: 0, fees: 0 }
  }
}

async function getEzwichStats(startDate: string, endDate: string) {
  try {
    // Use e_zwich_withdrawals table instead of e_zwich_transactions
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM e_zwich_withdrawals 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    }
  } catch (error) {
    console.error("Error fetching E-Zwich stats:", error)
    return { count: 0, volume: 0, fees: 0 }
  }
}

async function getJumiaStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM jumia_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    }
  } catch (error) {
    console.error("Error fetching Jumia stats:", error)
    return { count: 0, volume: 0, fees: 0 }
  }
}

async function getPowerStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(SUM(fee), 0) as fees
      FROM power_transactions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      volume: Number.parseFloat(result[0]?.volume || "0"),
      fees: Number.parseFloat(result[0]?.fees || "0"),
    }
  } catch (error) {
    console.error("Error fetching power stats:", error)
    return { count: 0, volume: 0, fees: 0 }
  }
}

async function getFloatStats() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_accounts,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(CASE WHEN balance < threshold THEN 1 ELSE 0 END), 0) as low_balance_accounts
      FROM float_accounts
    `
    return {
      totalAccounts: Number.parseInt(result[0]?.total_accounts || "0"),
      totalBalance: Number.parseFloat(result[0]?.total_balance || "0"),
      lowBalanceAccounts: Number.parseInt(result[0]?.low_balance_accounts || "0"),
    }
  } catch (error) {
    console.error("Error fetching float stats:", error)
    return { totalAccounts: 0, totalBalance: 0, lowBalanceAccounts: 0 }
  }
}

async function getCommissionStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM commissions 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      total: Number.parseFloat(result[0]?.total || "0"),
      approved: Number.parseFloat(result[0]?.approved || "0"),
      pending: Number.parseFloat(result[0]?.pending || "0"),
    }
  } catch (error) {
    console.error("Error fetching commission stats:", error)
    return { count: 0, total: 0, approved: 0, pending: 0 }
  }
}

async function getExpenseStats(startDate: string, endDate: string) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM expenses 
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `
    return {
      count: Number.parseInt(result[0]?.count || "0"),
      total: Number.parseFloat(result[0]?.total || "0"),
      approved: Number.parseFloat(result[0]?.approved || "0"),
      pending: Number.parseFloat(result[0]?.pending || "0"),
    }
  } catch (error) {
    console.error("Error fetching expense stats:", error)
    return { count: 0, total: 0, approved: 0, pending: 0 }
  }
}

async function getChartData(startDate: string, endDate: string) {
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
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'momo' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM momo_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'ezwich' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM e_zwich_withdrawals 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'jumia' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM jumia_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY date_trunc('day', created_at)::date
        
        UNION ALL
        
        SELECT 
          date_trunc('day', created_at)::date as date,
          'power' as service,
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume
        FROM power_transactions 
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
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
    `

    return result.map((row) => ({
      date: row.date,
      agencyBanking: Number.parseInt(row.agency_banking_transactions || "0"),
      momo: Number.parseInt(row.momo_transactions || "0"),
      ezwich: Number.parseInt(row.ezwich_transactions || "0"),
      jumia: Number.parseInt(row.jumia_transactions || "0"),
      power: Number.parseInt(row.power_transactions || "0"),
      totalVolume: Number.parseFloat(row.total_volume || "0"),
    }))
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return []
  }
}
