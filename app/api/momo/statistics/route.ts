import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 })
    }

    console.log("Fetching MoMo statistics for branch:", branchId)

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS momo_transactions (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        fee DECIMAL(10,2) DEFAULT 0,
        customer_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        reference VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        branch_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        gl_entry_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    const today = new Date().toISOString().split("T")[0]

    // Get today's statistics
    const todayStats = await sql`
      SELECT 
        COUNT(*) as today_transactions,
        COALESCE(SUM(amount), 0) as today_volume,
        COALESCE(SUM(fee), 0) as today_commission
      FROM momo_transactions 
      WHERE branch_id = ${branchId}
      AND DATE(created_at) = ${today}
      AND status = 'completed'
    `

    // Get total statistics
    const totalStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(fee), 0) as total_commission
      FROM momo_transactions 
      WHERE branch_id = ${branchId}
      AND status = 'completed'
    `

    // Get active providers count
    const providerStats = await sql`
      SELECT COUNT(DISTINCT provider) as active_providers
      FROM momo_transactions 
      WHERE branch_id = ${branchId}
      AND status = 'completed'
    `

    // Get float balance from float accounts
    const floatStats = await sql`
      SELECT COALESCE(SUM(current_balance), 0) as float_balance
      FROM float_accounts 
      WHERE branch_id = ${branchId}
      AND is_active = true
      AND (account_type = 'momo' OR LOWER(provider) LIKE '%momo%')
    `

    const statistics = {
      todayTransactions: Number(todayStats[0]?.today_transactions || 0),
      totalTransactions: Number(totalStats[0]?.total_transactions || 0),
      todayVolume: Number(todayStats[0]?.today_volume || 0),
      totalVolume: Number(totalStats[0]?.total_volume || 0),
      todayCommission: Number(todayStats[0]?.today_commission || 0),
      totalCommission: Number(totalStats[0]?.total_commission || 0),
      activeProviders: Number(providerStats[0]?.active_providers || 0),
      floatBalance: Number(floatStats[0]?.float_balance || 0),
      lowFloatAlerts: 0, // Will be calculated from float accounts
    }

    console.log("MoMo statistics:", statistics)

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    console.error("Error fetching MoMo statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo statistics",
        data: {
          todayTransactions: 0,
          totalTransactions: 0,
          todayVolume: 0,
          totalVolume: 0,
          todayCommission: 0,
          totalCommission: 0,
          activeProviders: 0,
          floatBalance: 0,
          lowFloatAlerts: 0,
        },
      },
      { status: 500 },
    )
  }
}
