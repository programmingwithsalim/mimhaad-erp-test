import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get notification settings from system_config table
    const configs = await sql`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE category = 'notification' OR config_key LIKE '%notification%'
    `

    // Transform to expected format
    const settings = configs.reduce((acc: any, config: any) => {
      acc[config.config_key] = config.config_value
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        emailNotifications: settings.email_notifications === "true",
        emailAddress: settings.notification_email || "",
        smsNotifications: settings.enable_sms_notifications === "true",
        phoneNumber: settings.notification_phone || "",
        transactionAlerts: settings.transaction_alerts === "true",
        floatThresholdAlerts: settings.float_threshold_alerts === "true",
        systemUpdates: settings.system_updates === "true",
        securityAlerts: settings.security_alerts === "true",
        dailyReports: settings.daily_reports === "true",
        weeklyReports: settings.weekly_reports === "true",
        quietHoursEnabled: settings.quiet_hours_enabled === "true",
        quietHoursStart: settings.quiet_hours_start || "22:00",
        quietHoursEnd: settings.quiet_hours_end || "08:00",
        alertFrequency: settings.alert_frequency || "immediate",
        reportFrequency: settings.report_frequency || "weekly",
      },
    })
  } catch (error) {
    console.error("Error fetching notification settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notification settings",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()

    // Convert form data to system_config entries
    const configs = [
      { config_key: "email_notifications", config_value: data.emailNotifications.toString(), category: "notification" },
      { config_key: "notification_email", config_value: data.emailAddress || "", category: "notification" },
      {
        config_key: "enable_sms_notifications",
        config_value: data.smsNotifications.toString(),
        category: "notification",
      },
      { config_key: "notification_phone", config_value: data.phoneNumber || "", category: "notification" },
      { config_key: "transaction_alerts", config_value: data.transactionAlerts.toString(), category: "notification" },
      {
        config_key: "float_threshold_alerts",
        config_value: data.floatThresholdAlerts.toString(),
        category: "notification",
      },
      { config_key: "system_updates", config_value: data.systemUpdates.toString(), category: "notification" },
      { config_key: "security_alerts", config_value: data.securityAlerts.toString(), category: "notification" },
      { config_key: "daily_reports", config_value: data.dailyReports.toString(), category: "notification" },
      { config_key: "weekly_reports", config_value: data.weeklyReports.toString(), category: "notification" },
      { config_key: "quiet_hours_enabled", config_value: data.quietHoursEnabled.toString(), category: "notification" },
      { config_key: "quiet_hours_start", config_value: data.quietHoursStart || "22:00", category: "notification" },
      { config_key: "quiet_hours_end", config_value: data.quietHoursEnd || "08:00", category: "notification" },
      { config_key: "alert_frequency", config_value: data.alertFrequency || "immediate", category: "notification" },
      { config_key: "report_frequency", config_value: data.reportFrequency || "weekly", category: "notification" },
    ]

    // Update or insert each configuration
    for (const config of configs) {
      await sql`
        INSERT INTO system_config (config_key, config_value, category, updated_at)
        VALUES (${config.config_key}, ${config.config_value}, ${config.category}, NOW())
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          updated_at = EXCLUDED.updated_at
      `
    }

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
      },
      { status: 500 },
    )
  }
}
