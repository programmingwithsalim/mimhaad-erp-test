import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create user notification settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- Email settings
          email_notifications BOOLEAN DEFAULT true,
          email_address VARCHAR(255),
          
          -- SMS settings
          sms_notifications BOOLEAN DEFAULT false,
          phone_number VARCHAR(20),
          
          -- Notification types
          transaction_alerts BOOLEAN DEFAULT true,
          float_threshold_alerts BOOLEAN DEFAULT true,
          system_updates BOOLEAN DEFAULT true,
          security_alerts BOOLEAN DEFAULT true,
          daily_reports BOOLEAN DEFAULT false,
          weekly_reports BOOLEAN DEFAULT false,
          
          -- Timing preferences
          quiet_hours_enabled BOOLEAN DEFAULT false,
          quiet_hours_start TIME DEFAULT '22:00',
          quiet_hours_end TIME DEFAULT '08:00',
          
          -- Frequency settings
          alert_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'hourly', 'daily')),
          report_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(user_id)
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notification_settings_email_notifications ON user_notification_settings(email_notifications)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_notification_settings_sms_notifications ON user_notification_settings(sms_notifications)`

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_user_notification_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings
    `

    await sql`
      CREATE TRIGGER update_user_notification_settings_updated_at
          BEFORE UPDATE ON user_notification_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_user_notification_settings_updated_at()
    `

    return NextResponse.json({
      success: true,
      message: "User notification settings table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing notification settings table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize notification settings table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
