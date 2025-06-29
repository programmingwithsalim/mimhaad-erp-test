import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get user from JWT token
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    // Get user's notification settings
    const settings = await sql`
      SELECT * FROM user_notification_settings 
      WHERE user_id = ${userId}
    `

    if (settings.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: {
          emailNotifications: true,
          smsNotifications: false,
          transactionAlerts: true,
          floatThresholdAlerts: true,
          systemUpdates: true,
          securityAlerts: true,
          dailyReports: false,
          weeklyReports: false,
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
          alertFrequency: "immediate",
          reportFrequency: "weekly",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: settings[0],
    })
  } catch (error) {
    console.error("Error fetching notification settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notification settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    // Get user from JWT token
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    const data = await request.json()

    // Upsert notification settings
    await sql`
      INSERT INTO user_notification_settings (
        user_id,
        email_notifications,
        email_address,
        sms_notifications,
        phone_number,
        transaction_alerts,
        float_threshold_alerts,
        system_updates,
        security_alerts,
        daily_reports,
        weekly_reports,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        alert_frequency,
        report_frequency
      ) VALUES (
        ${userId},
        ${data.emailNotifications},
        ${data.emailAddress || null},
        ${data.smsNotifications},
        ${data.phoneNumber || null},
        ${data.transactionAlerts},
        ${data.floatThresholdAlerts},
        ${data.systemUpdates},
        ${data.securityAlerts},
        ${data.dailyReports},
        ${data.weeklyReports},
        ${data.quietHoursEnabled},
        ${data.quietHoursStart},
        ${data.quietHoursEnd},
        ${data.alertFrequency},
        ${data.reportFrequency}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email_notifications = EXCLUDED.email_notifications,
        email_address = EXCLUDED.email_address,
        sms_notifications = EXCLUDED.sms_notifications,
        phone_number = EXCLUDED.phone_number,
        transaction_alerts = EXCLUDED.transaction_alerts,
        float_threshold_alerts = EXCLUDED.float_threshold_alerts,
        system_updates = EXCLUDED.system_updates,
        security_alerts = EXCLUDED.security_alerts,
        daily_reports = EXCLUDED.daily_reports,
        weekly_reports = EXCLUDED.weekly_reports,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        alert_frequency = EXCLUDED.alert_frequency,
        report_frequency = EXCLUDED.report_frequency,
        updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully",
    })
  } catch (error) {
    console.error("Error updating notification settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notification settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
