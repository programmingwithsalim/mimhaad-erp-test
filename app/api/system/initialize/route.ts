import { NextResponse } from "next/server"
import { AuditService } from "@/lib/audit-service"
import { SettingsService } from "@/lib/settings-service"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    // Initialize settings tables
    await SettingsService.initializeTables()

    // Create user_notification_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT true,
        push_enabled BOOLEAN DEFAULT false,
        login_alerts BOOLEAN DEFAULT true,
        transaction_alerts BOOLEAN DEFAULT true,
        low_balance_alerts BOOLEAN DEFAULT true,
        high_value_transaction_threshold DECIMAL(10,2) DEFAULT 1000.00,
        low_balance_threshold DECIMAL(10,2) DEFAULT 100.00,
        email_address VARCHAR(255),
        phone_number VARCHAR(20),
        sms_provider VARCHAR(50) DEFAULT 'hubtel',
        sms_api_key VARCHAR(255),
        sms_api_secret VARCHAR(255),
        sms_sender_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `

    // Create indexes for user_notification_settings
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_notification_settings_email_enabled ON user_notification_settings(email_enabled)
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_notification_settings_sms_enabled ON user_notification_settings(sms_enabled)
    `

    // Seed default settings and fees
    await SettingsService.seedDefaultSettings()

    // Seed GL mappings for float accounts
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gl/mappings/seed`, {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        console.log("GL mappings seeded:", result.message);
      } else {
        console.log("GL mappings seeding failed or already exists");
      }
    } catch (error) {
      console.log("GL mappings seeding error:", error);
    }

    // Create system_logs table for structured logging
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        level VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        user_id UUID REFERENCES users(id),
        branch_id UUID REFERENCES branches(id),
        transaction_id VARCHAR(255),
        entity_id VARCHAR(255),
        entity_type VARCHAR(100),
        metadata JSONB,
        error_message TEXT,
        stack_trace TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index for efficient querying
    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_system_logs_transaction_id ON system_logs(transaction_id)
    `;

    // Create some sample audit logs
    await AuditService.log({
      userId: "system",
      username: "system",
      actionType: "system_initialization",
      entityType: "system_config",
      description: "System tables initialized and default settings configured",
      severity: "medium",
    })

    // Add sample audit logs
    const sampleLogs = [
      {
        userId: "1",
        username: "admin",
        actionType: "login",
        entityType: "user",
        entityId: "1",
        description: "Administrator logged in successfully",
        details: { ip_address: "192.168.1.100", browser: "Chrome" },
        severity: "low" as const,
        branchId: "1",
        branchName: "Accra Main Branch",
      },
      {
        userId: "2",
        username: "manager1",
        actionType: "transaction_deposit",
        entityType: "transaction",
        entityId: "TXN001",
        description: "Customer deposit transaction processed",
        details: { amount: 1500, currency: "GHS", customer_id: "CUST001" },
        severity: "medium" as const,
        branchId: "1",
        branchName: "Accra Main Branch",
      },
      {
        userId: "3",
        username: "cashier1",
        actionType: "float_addition",
        entityType: "float_account",
        entityId: "FLOAT001",
        description: "Float account replenishment",
        details: { amount: 10000, currency: "GHS", float_type: "MoMo" },
        severity: "high" as const,
        branchId: "2",
        branchName: "Kumasi Branch",
      },
      {
        userId: "unknown",
        username: "hacker123",
        actionType: "failed_login",
        entityType: "user",
        description: "Failed login attempt with invalid credentials",
        details: { ip_address: "203.0.113.45", attempts: 3 },
        severity: "high" as const,
        status: "failure" as const,
        errorMessage: "Invalid username or password",
      },
    ]

    for (const log of sampleLogs) {
      await AuditService.log(log)
    }

    return NextResponse.json({
      success: true,
      message: "System initialized successfully with audit logs, settings, and fee configurations",
      data: {
        audit_logs_created: true,
        settings_initialized: true,
        fee_configurations_created: true,
        sample_data_added: true,
        notification_settings_table_created: true,
      },
    })
  } catch (error) {
    console.error("Error initializing system:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize system",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
