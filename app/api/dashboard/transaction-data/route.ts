import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get daily transaction data for the specified period
    const transactionData = await sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '30 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      ),
      daily_transactions AS (
        SELECT 
          DATE(created_at) as transaction_date,
          SUM(amount::numeric) as daily_amount,
          COUNT(*) as daily_count
        FROM (
          SELECT created_at, amount FROM momo_transactions WHERE status = 'completed'
          UNION ALL
          SELECT created_at, amount FROM agency_banking_transactions WHERE status = 'completed'
          UNION ALL
          SELECT processed_at as created_at, amount FROM withdrawal_transactions WHERE status = 'completed'
          UNION ALL
          SELECT created_at, amount FROM power_transactions WHERE status = 'completed'
          UNION ALL
          SELECT created_at, amount FROM jumia_transactions WHERE status = 'completed'
        ) all_transactions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      )
      SELECT 
        ds.date,
        COALESCE(dt.daily_amount, 0) as amount,
        COALESCE(dt.daily_count, 0) as count
      FROM date_series ds
      LEFT JOIN daily_transactions dt ON ds.date = dt.transaction_date
      ORDER BY ds.date
    `

    // Filter data based on requested days on the client side
    const filteredData = transactionData.slice(-days)

    // Get revenue by service type (last 30 days)
    const revenueByService = await sql`
      SELECT 
        'MoMo' as service,
        COALESCE(SUM(amount::numeric), 0) as revenue,
        COUNT(*) as transactions
      FROM momo_transactions 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'Agency Banking' as service,
        COALESCE(SUM(amount::numeric), 0) as revenue,
        COUNT(*) as transactions
      FROM agency_banking_transactions 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'E-Zwich' as service,
        COALESCE(SUM(amount::numeric), 0) as revenue,
        COUNT(*) as transactions
      FROM withdrawal_transactions 
      WHERE status = 'completed' AND processed_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'Power' as service,
        COALESCE(SUM(amount::numeric), 0) as revenue,
        COUNT(*) as transactions
      FROM power_transactions 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'Jumia' as service,
        COALESCE(SUM(amount::numeric), 0) as revenue,
        COUNT(*) as transactions
      FROM jumia_transactions 
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    // Get transaction distribution by type
    const transactionDistribution = await sql`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount::numeric) as total_amount
      FROM (
        SELECT 'cash-in' as transaction_type, amount FROM momo_transactions WHERE type = 'cash-in' AND status = 'completed'
        UNION ALL
        SELECT 'cash-out' as transaction_type, amount FROM momo_transactions WHERE type = 'cash-out' AND status = 'completed'
        UNION ALL
        SELECT 'deposit' as transaction_type, amount FROM agency_banking_transactions WHERE type = 'deposit' AND status = 'completed'
        UNION ALL
        SELECT 'withdrawal' as transaction_type, amount FROM agency_banking_transactions WHERE type = 'withdrawal' AND status = 'completed'
        UNION ALL
        SELECT 'card-withdrawal' as transaction_type, amount FROM withdrawal_transactions WHERE status = 'completed'
        UNION ALL
        SELECT 'power-purchase' as transaction_type, amount FROM power_transactions WHERE status = 'completed'
        UNION ALL
        SELECT 'jumia-payment' as transaction_type, amount FROM jumia_transactions WHERE status = 'completed'
      ) all_types
      GROUP BY transaction_type
      ORDER BY count DESC
    `

    return NextResponse.json({
      success: true,
      data: {
        dailyTransactions: filteredData.map((row) => ({
          date: row.date,
          amount: Number(row.amount),
          count: Number(row.count),
        })),
        revenueByService: revenueByService.map((row) => ({
          service: row.service,
          revenue: Number(row.revenue),
          transactions: Number(row.transactions),
        })),
        transactionDistribution: transactionDistribution.map((row) => ({
          type: row.transaction_type,
          count: Number(row.count),
          amount: Number(row.total_amount),
        })),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching transaction data:", error)

    return NextResponse.json({
      success: false,
      data: {
        dailyTransactions: [],
        revenueByService: [],
        transactionDistribution: [],
      },
      error: error instanceof Error ? error.message : "Failed to fetch transaction data",
      timestamp: new Date().toISOString(),
    })
  }
}
