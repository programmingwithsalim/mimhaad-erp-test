import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Get monthly user growth for the last 12 months
    const userGrowthData = await sql`
      WITH month_series AS (
        SELECT 
          date_trunc('month', generate_series(
            CURRENT_DATE - INTERVAL '11 months',
            CURRENT_DATE,
            INTERVAL '1 month'
          )) as month
      ),
      monthly_users AS (
        SELECT 
          date_trunc('month', created_at) as month,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '11 months'
        GROUP BY date_trunc('month', created_at)
      ),
      cumulative_users AS (
        SELECT 
          ms.month,
          COALESCE(mu.new_users, 0) as new_users,
          SUM(COALESCE(mu.new_users, 0)) OVER (ORDER BY ms.month) as cumulative_users
        FROM month_series ms
        LEFT JOIN monthly_users mu ON ms.month = mu.month
      )
      SELECT 
        month,
        new_users,
        cumulative_users
      FROM cumulative_users
      ORDER BY month
    `

    // Get total user count
    const totalUsersResult = await sql`
      SELECT COUNT(*) as total_users FROM users
    `

    const totalUsers = Number(totalUsersResult[0]?.total_users || 0)

    return NextResponse.json({
      success: true,
      data: {
        monthlyGrowth: userGrowthData.map((row) => ({
          month: row.month,
          newUsers: Number(row.new_users),
          cumulativeUsers: Number(row.cumulative_users),
        })),
        totalUsers,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching user growth data:", error)

    return NextResponse.json({
      success: false,
      data: {
        monthlyGrowth: [],
        totalUsers: 0,
      },
      error: error instanceof Error ? error.message : "Failed to fetch user growth data",
      timestamp: new Date().toISOString(),
    })
  }
}
