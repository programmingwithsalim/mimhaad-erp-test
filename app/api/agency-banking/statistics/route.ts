import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth-service"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { user } = session
    const branchFilter = user.role === "admin" ? null : user.branchId

    // Get today's statistics
    let todayStats
    if (branchFilter) {
      todayStats = await sql`
        SELECT 
          COUNT(*) as today_transactions,
          COALESCE(SUM(amount), 0) as today_volume,
          COALESCE(SUM(fee), 0) as today_fees
        FROM agency_banking_transactions
        WHERE DATE(created_at) = CURRENT_DATE
          AND branch_id = ${branchFilter}
      `
    } else {
      todayStats = await sql`
        SELECT 
          COUNT(*) as today_transactions,
          COALESCE(SUM(amount), 0) as today_volume,
          COALESCE(SUM(fee), 0) as today_fees
        FROM agency_banking_transactions
        WHERE DATE(created_at) = CURRENT_DATE
      `
    }

    // Get weekly statistics
    let weeklyStats
    if (branchFilter) {
      weeklyStats = await sql`
        SELECT 
          COUNT(*) as weekly_transactions,
          COALESCE(SUM(amount), 0) as weekly_volume,
          COALESCE(SUM(fee), 0) as weekly_fees
        FROM agency_banking_transactions
        WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
          AND branch_id = ${branchFilter}
      `
    } else {
      weeklyStats = await sql`
        SELECT 
          COUNT(*) as weekly_transactions,
          COALESCE(SUM(amount), 0) as weekly_volume,
          COALESCE(SUM(fee), 0) as weekly_fees
        FROM agency_banking_transactions
        WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
      `
    }

    // Get monthly statistics
    let monthlyStats
    if (branchFilter) {
      monthlyStats = await sql`
        SELECT 
          COUNT(*) as monthly_transactions,
          COALESCE(SUM(amount), 0) as monthly_volume,
          COALESCE(SUM(fee), 0) as monthly_fees
        FROM agency_banking_transactions
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
          AND branch_id = ${branchFilter}
      `
    } else {
      monthlyStats = await sql`
        SELECT 
          COUNT(*) as monthly_transactions,
          COALESCE(SUM(amount), 0) as monthly_volume,
          COALESCE(SUM(fee), 0) as monthly_fees
        FROM agency_banking_transactions
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `
    }

    const today = todayStats[0] || { today_transactions: 0, today_volume: 0, today_fees: 0 }
    const weekly = weeklyStats[0] || { weekly_transactions: 0, weekly_volume: 0, weekly_fees: 0 }
    const monthly = monthlyStats[0] || { monthly_transactions: 0, monthly_volume: 0, monthly_fees: 0 }

    return NextResponse.json({
      success: true,
      stats: {
        todayTransactions: Number(today.today_transactions),
        todayVolume: Number(today.today_volume),
        todayFees: Number(today.today_fees),
        weeklyTransactions: Number(weekly.weekly_transactions),
        weeklyVolume: Number(weekly.weekly_volume),
        weeklyFees: Number(weekly.weekly_fees),
        monthlyTransactions: Number(monthly.monthly_transactions),
        monthlyVolume: Number(monthly.monthly_volume),
        monthlyFees: Number(monthly.monthly_fees),
      },
    })
  } catch (error) {
    console.error("Error fetching Agency Banking statistics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
