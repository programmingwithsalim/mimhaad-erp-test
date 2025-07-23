import { NextRequest, NextResponse } from "next/server";
import { getDatabaseSession } from "@/lib/database-session-service";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const session = await getDatabaseSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Get system configuration from database
    const configResult = await sql`
      SELECT config FROM system_config WHERE id = 1
    `;

    const config = configResult[0];

    if (!config) {
      // Return default configuration if none exists
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

      return NextResponse.json({
        success: true,
        data: defaultConfig,
      });
    }

    return NextResponse.json({
      success: true,
      data: config.config,
    });
  } catch (error) {
    console.error("Error fetching system config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getDatabaseSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.systemName) {
      return NextResponse.json(
        { success: false, error: "System name is required" },
        { status: 400 }
      );
    }

    // Update or create system configuration
    const config = await sql`
      INSERT INTO system_config (id, config, created_at, updated_at)
      VALUES (1, ${JSON.stringify(body)}, NOW(), NOW())
      ON CONFLICT (id) 
      DO UPDATE SET 
        config = EXCLUDED.config,
        updated_at = NOW()
      RETURNING config
    `;

    return NextResponse.json({
      success: true,
      data: config[0].config,
      message: "System configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating system config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update system configuration" },
      { status: 500 }
    );
  }
}
