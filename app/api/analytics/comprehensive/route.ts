"use server"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Get transaction statistics
    const transactionStats = await getTransactionStatistics(branchId, startDate, endDate)

    // Get service performance
    const servicePerformance = await getServicePerformance(branchId, startDate, endDate)

    // Get revenue breakdown
    const revenueBreakdown = await getRevenueBreakdown(branchId, startDate, endDate)

    // Get user activity
    const userActivity = await getUserActivity(branchId, startDate, endDate)

    return NextResponse.json({
      success: true,
      data: {
        transactionStats,
        servicePerformance,
        revenueBreakdown,
        userActivity,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching comprehensive analytics:", error)

    // Return mock data structure
    return NextResponse.json({
      success: true,
      data: {
        transactionStats: {
          totalTransactions: 0,
          totalVolume: 0,
          averageTransaction: 0,
          successRate: 100,
          dailyTrends: [],
        },
        servicePerformance: {
          momo: { transactions: 0, volume: 0, fees: 0 },
          agencyBanking: { transactions: 0, volume: 0, fees: 0 },
          ezwich: { transactions: 0, volume: 0, fees: 0 },
          power: { transactions: 0, volume: 0, fees: 0 },
          jumia: { transactions: 0, volume: 0, fees: 0 },
        },
        revenueBreakdown: {
          totalRevenue: 0,
          byService: {},
          monthlyTrends: [],
        },
        userActivity: {
          activeUsers: 0,
          topPerformers: [],
          branchActivity: [],
        },
        lastUpdated: new Date().toISOString(),
      },
    })
  }
}

async function getTransactionStatistics(branchId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    let whereClause = "WHERE 1=1"
    const params: any[] = []

    if (branchId) {
      whereClause += ` AND branch_id = $${params.length + 1}`
      params.push(branchId)
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${params.length + 1}`
      params.push(startDate)
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${params.length + 1}`
      params.push(endDate)
    }

    // Try to get from multiple transaction tables
    const momoStats = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(AVG(amount), 0) as avg_amount
      FROM momo_transactions 
      ${sql.unsafe(whereClause)}
    `

    const agencyStats = await sql`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(AVG(amount), 0) as avg_amount
      FROM agency_banking_transactions 
      ${sql.unsafe(whereClause)}
    `

    const totalTransactions = Number(momoStats[0]?.count || 0) + Number(agencyStats[0]?.count || 0)
    const totalVolume = Number(momoStats[0]?.volume || 0) + Number(agencyStats[0]?.volume || 0)
    const averageTransaction = totalTransactions > 0 ? totalVolume / totalTransactions : 0

    return {
      totalTransactions,
      totalVolume,
      averageTransaction,
      successRate: 100,
      dailyTrends: [],
    }
  } catch (error) {
    console.error("Error getting transaction statistics:", error)
    return {
      totalTransactions: 0,
      totalVolume: 0,
      averageTransaction: 0,
      successRate: 100,
      dailyTrends: [],
    }
  }
}

async function getServicePerformance(branchId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    let whereClause = "WHERE 1=1"

    if (branchId) {
      whereClause += ` AND branch_id = '${branchId}'`
    }

    if (startDate) {
      whereClause += ` AND created_at >= '${startDate}'`
    }

    if (endDate) {
      whereClause += ` AND created_at <= '${endDate}'`
    }

    const services = {
      momo: { transactions: 0, volume: 0, fees: 0 },
      agencyBanking: { transactions: 0, volume: 0, fees: 0 },
      ezwich: { transactions: 0, volume: 0, fees: 0 },
      power: { transactions: 0, volume: 0, fees: 0 },
      jumia: { transactions: 0, volume: 0, fees: 0 },
    }

    // Get MoMo stats
    try {
      const momoQuery = `
        SELECT 
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume,
          COALESCE(SUM(fee), 0) as fees
        FROM momo_transactions 
        ${whereClause}
      `
      const momoResult = await sql.unsafe(momoQuery)
      if (momoResult[0]) {
        services.momo = {
          transactions: Number(momoResult[0].transactions),
          volume: Number(momoResult[0].volume),
          fees: Number(momoResult[0].fees),
        }
      }
    } catch (error) {
      console.log("MoMo table not available")
    }

    // Get Agency Banking stats
    try {
      const agencyQuery = `
        SELECT 
          COUNT(*) as transactions,
          COALESCE(SUM(amount), 0) as volume,
          COALESCE(SUM(fee), 0) as fees
        FROM agency_banking_transactions 
        ${whereClause}
      `
      const agencyResult = await sql.unsafe(agencyQuery)
      if (agencyResult[0]) {
        services.agencyBanking = {
          transactions: Number(agencyResult[0].transactions),
          volume: Number(agencyResult[0].volume),
          fees: Number(agencyResult[0].fees),
        }
      }
    } catch (error) {
      console.log("Agency Banking table not available")
    }

    return services
  } catch (error) {
    console.error("Error getting service performance:", error)
    return {
      momo: { transactions: 0, volume: 0, fees: 0 },
      agencyBanking: { transactions: 0, volume: 0, fees: 0 },
      ezwich: { transactions: 0, volume: 0, fees: 0 },
      power: { transactions: 0, volume: 0, fees: 0 },
      jumia: { transactions: 0, volume: 0, fees: 0 },
    }
  }
}

async function getRevenueBreakdown(branchId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    return {
      totalRevenue: 0,
      byService: {},
      monthlyTrends: [],
    }
  } catch (error) {
    console.error("Error getting revenue breakdown:", error)
    return {
      totalRevenue: 0,
      byService: {},
      monthlyTrends: [],
    }
  }
}

async function getUserActivity(branchId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    return {
      activeUsers: 0,
      topPerformers: [],
      branchActivity: [],
    }
  } catch (error) {
    console.error("Error getting user activity:", error)
    return {
      activeUsers: 0,
      topPerformers: [],
      branchActivity: [],
    }
  }
}
