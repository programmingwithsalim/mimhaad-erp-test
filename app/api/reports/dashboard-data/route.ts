import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Get transaction statistics
    const momoStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_volume,
        SUM(fee) as total_fees
      FROM momo_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND (${dateFrom}::text IS NULL OR created_at >= ${dateFrom}::timestamp)
        AND (${dateTo}::text IS NULL OR created_at <= ${dateTo}::timestamp)
        AND status = 'completed'
    `

    const powerStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_volume,
        SUM(fee) as total_fees
      FROM power_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND (${dateFrom}::text IS NULL OR created_at >= ${dateFrom}::timestamp)
        AND (${dateTo}::text IS NULL OR created_at <= ${dateTo}::timestamp)
        AND status = 'completed'
    `

    const ezwichStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_volume,
        SUM(fee) as total_fees
      FROM e_zwich_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND (${dateFrom}::text IS NULL OR created_at >= ${dateFrom}::timestamp)
        AND (${dateTo}::text IS NULL OR created_at <= ${dateTo}::timestamp)
        AND status = 'completed'
    `

    const agencyStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_volume,
        SUM(fee) as total_fees
      FROM agency_banking_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND (${dateFrom}::text IS NULL OR created_at >= ${dateFrom}::timestamp)
        AND (${dateTo}::text IS NULL OR created_at <= ${dateTo}::timestamp)
        AND status = 'completed'
    `

    // Get float account balances
    const floatBalances = await sql`
      SELECT 
        account_type,
        SUM(current_balance) as total_balance
      FROM float_accounts 
      WHERE 
        is_active = true
        AND (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
      GROUP BY account_type
    `

    // Get recent transactions
    const recentTransactions = await sql`
      SELECT 
        'momo' as service,
        customer_name,
        amount,
        fee,
        created_at,
        status
      FROM momo_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND created_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'power' as service,
        customer_name,
        amount,
        fee,
        created_at,
        status
      FROM power_transactions 
      WHERE 
        (${branchId}::text IS NULL OR branch_id = ${branchId}::uuid)
        AND created_at >= NOW() - INTERVAL '7 days'
      
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      data: {
        services: {
          momo: {
            transactions: Number(momoStats[0]?.total_transactions || 0),
            volume: Number(momoStats[0]?.total_volume || 0),
            fees: Number(momoStats[0]?.total_fees || 0),
          },
          power: {
            transactions: Number(powerStats[0]?.total_transactions || 0),
            volume: Number(powerStats[0]?.total_volume || 0),
            fees: Number(powerStats[0]?.total_fees || 0),
          },
          ezwich: {
            transactions: Number(ezwichStats[0]?.total_transactions || 0),
            volume: Number(ezwichStats[0]?.total_volume || 0),
            fees: Number(ezwichStats[0]?.total_fees || 0),
          },
          agency: {
            transactions: Number(agencyStats[0]?.total_transactions || 0),
            volume: Number(agencyStats[0]?.total_volume || 0),
            fees: Number(agencyStats[0]?.total_fees || 0),
          },
        },
        floatBalances: floatBalances.map((row) => ({
          type: row.account_type,
          balance: Number(row.total_balance || 0),
        })),
        recentTransactions: recentTransactions.map((row) => ({
          service: row.service,
          customer: row.customer_name,
          amount: Number(row.amount),
          fee: Number(row.fee),
          date: row.created_at,
          status: row.status,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
