import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    console.log("🔔 Initializing notifications schema...")

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        branch_id UUID,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'unread',
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create user_notification_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT true,
        login_alerts BOOLEAN DEFAULT true,
        transaction_alerts BOOLEAN DEFAULT true,
        float_threshold_alerts BOOLEAN DEFAULT true,
        alert_frequency VARCHAR(20) DEFAULT 'immediate',
        email_address VARCHAR(255),
        phone_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)
    `

    console.log("✅ Notifications schema initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Notifications schema initialized successfully",
    })
  } catch (error) {
    console.error("❌ Error initializing notifications schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize notifications schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
