import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Check if audit_logs table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      )
    `

    if (!tableExists[0]?.exists) {
      return NextResponse.json({
        success: true,
        data: {
          totalLogs: 0,
          criticalEvents: 0,
          failedActions: 0,
          activeUsers: 0,
          recentActivity: [],
          severityBreakdown: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          actionTypeBreakdown: {},
          dailyActivity: [],
        },
      })
    }

    // Get total logs count
    const totalLogsResult = await sql`
      SELECT COUNT(*) as total FROM audit_logs
    `
    const totalLogs = Number.parseInt(totalLogsResult[0]?.total || "0")

    // Get critical events count (critical and high severity)
    const criticalEventsResult = await sql`
      SELECT COUNT(*) as total FROM audit_logs 
      WHERE severity IN ('critical', 'high')
    `
    const criticalEvents = Number.parseInt(criticalEventsResult[0]?.total || "0")

    // Get failed actions count
    const failedActionsResult = await sql`
      SELECT COUNT(*) as total FROM audit_logs 
      WHERE status = 'failure'
    `
    const failedActions = Number.parseInt(failedActionsResult[0]?.total || "0")

    // Get active users count (unique users in last 24 hours)
    const activeUsersResult = await sql`
      SELECT COUNT(DISTINCT user_id) as total FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `
    const activeUsers = Number.parseInt(activeUsersResult[0]?.total || "0")

    // Get recent activity (last 10 logs)
    const recentActivity = await sql`
      SELECT 
        id,
        username,
        action_type as "actionType",
        entity_type as "entityType",
        description,
        severity,
        status,
        created_at as "timestamp"
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `

    // Get severity breakdown
    const severityBreakdownResult = await sql`
      SELECT 
        severity,
        COUNT(*) as count
      FROM audit_logs 
      GROUP BY severity
    `

    const severityBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }

    severityBreakdownResult.forEach((row) => {
      if (row.severity in severityBreakdown) {
        severityBreakdown[row.severity as keyof typeof severityBreakdown] = Number.parseInt(row.count)
      }
    })

    // Get action type breakdown
    const actionTypeBreakdownResult = await sql`
      SELECT 
        action_type as "actionType",
        COUNT(*) as count
      FROM audit_logs 
      GROUP BY action_type
      ORDER BY count DESC
      LIMIT 10
    `

    const actionTypeBreakdown: Record<string, number> = {}
    actionTypeBreakdownResult.forEach((row) => {
      actionTypeBreakdown[row.actionType] = Number.parseInt(row.count)
    })

    // Get daily activity for the last 7 days
    const dailyActivityResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN severity IN ('critical', 'high') THEN 1 END) as critical_count,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failure_count
      FROM audit_logs 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    const dailyActivity = dailyActivityResult.map((row) => ({
      date: row.date,
      total: Number.parseInt(row.count),
      critical: Number.parseInt(row.critical_count),
      failures: Number.parseInt(row.failure_count),
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalLogs,
        criticalEvents,
        failedActions,
        activeUsers,
        recentActivity,
        severityBreakdown,
        actionTypeBreakdown,
        dailyActivity,
      },
    })
  } catch (error) {
    console.error("Error fetching audit log statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audit log statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
