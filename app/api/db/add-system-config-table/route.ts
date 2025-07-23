import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting system_config table migration...");

    // Create system_config table
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create system_backups table
    await sql`
      CREATE TABLE IF NOT EXISTS system_backups (
        id SERIAL PRIMARY KEY,
        backup_id VARCHAR(255) UNIQUE NOT NULL,
        backup_type VARCHAR(50) NOT NULL DEFAULT 'manual',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        file_path TEXT,
        size_bytes BIGINT DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default system configuration if table is empty
    const existingConfig = await sql`
      SELECT COUNT(*) as count FROM system_config
    `;

    if (existingConfig[0].count === 0) {
      const defaultConfig = {
        systemName: "Mimhaad Financial Services",
        systemVersion: "1.0.0",
        maintenanceMode: false,
        debugMode: false,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
        backupSettings: {
          autoBackup: true,
          backupFrequency: "daily",
          retentionDays: 30,
          backupLocation: "",
        },
        securitySettings: {
          enableTwoFactor: false,
          requireTwoFactorForAdmins: true,
          enableAuditLogs: true,
          enableIpWhitelist: false,
          allowedIps: "",
        },
      };

      await sql`
        INSERT INTO system_config (id, config, created_at, updated_at)
        VALUES (1, ${JSON.stringify(defaultConfig)}, NOW(), NOW())
      `;

      console.log("✅ Default system configuration inserted");
    }

    console.log(
      "✅ system_config and system_backups tables migration completed"
    );

    return NextResponse.json({
      success: true,
      message: "System configuration tables created successfully",
      tables: ["system_config", "system_backups"],
    });
  } catch (error) {
    console.error("❌ Error in system_config migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create system configuration tables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
