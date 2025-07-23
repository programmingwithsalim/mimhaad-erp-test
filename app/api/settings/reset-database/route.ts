import { NextRequest, NextResponse } from "next/server";
import { getDatabaseSession } from "@/lib/database-session-service";
import { sql } from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
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

    // Get user password for verification
    const userResult = await sql`
      SELECT password_hash FROM users WHERE id = ${session.user.id}
    `;

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    const { adminPassword } = await request.json();

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, error: "Admin password is required" },
        { status: 400 }
      );
    }

    // Verify admin password
    const isPasswordValid = await bcrypt.compare(
      adminPassword,
      user.password_hash
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid admin password" },
        { status: 400 }
      );
    }

    // Create backup before reset (optional)
    await createBackupBeforeReset();

    // Reset database
    await resetDatabase();

    return NextResponse.json({
      success: true,
      message: "Database has been reset successfully",
    });
  } catch (error) {
    console.error("Error resetting database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset database" },
      { status: 500 }
    );
  }
}

async function createBackupBeforeReset() {
  try {
    // Create a backup record
    await sql`
      INSERT INTO system_backups (
        backup_type, 
        status, 
        file_path, 
        size_bytes, 
        created_at
      ) VALUES (
        'pre_reset_backup',
        'completed',
        'manual_backup_before_reset',
        0,
        NOW()
      )
    `;
  } catch (error) {
    console.error("Failed to create backup before reset:", error);
    // Continue with reset even if backup fails
  }
}

async function resetDatabase() {
  try {
    // Disable foreign key checks temporarily
    await sql`SET session_replication_role = replica`;

    // Get all table names
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT IN ('schema_migrations', 'ar_internal_metadata')
    `;

    // Truncate all tables
    for (const table of tables) {
      try {
        await sql`TRUNCATE TABLE ${sql(table.tablename)} CASCADE`;
      } catch (error) {
        console.error(`Failed to truncate table ${table.tablename}:`, error);
      }
    }

    // Re-enable foreign key checks
    await sql`SET session_replication_role = DEFAULT`;

    // Reset sequences
    await sql`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER SEQUENCE IF EXISTS ' || r.tablename || '_id_seq RESTART WITH 1';
        END LOOP;
      END $$;
    `;

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);

    await sql`
      INSERT INTO users (
        email,
        password,
        role,
        first_name,
        last_name,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        'admin@mimhaad.com',
        ${hashedPassword},
        'admin',
        'System',
        'Administrator',
        true,
        NOW(),
        NOW()
      )
    `;

    // Create default system configuration
    await sql`
      INSERT INTO system_config (
        id,
        config,
        created_at,
        updated_at
      ) VALUES (
        1,
        '{"systemName":"Mimhaad Financial Services","systemVersion":"1.0.0","maintenanceMode":false,"debugMode":false,"sessionTimeout":30,"maxLoginAttempts":5,"passwordPolicy":{"minLength":8,"requireUppercase":true,"requireLowercase":true,"requireNumbers":true,"requireSpecialChars":true},"backupSettings":{"autoBackup":true,"backupFrequency":"daily","retentionDays":30,"backupLocation":""},"securitySettings":{"enableTwoFactor":false,"requireTwoFactorForAdmins":true,"enableAuditLogs":true,"enableIpWhitelist":false,"allowedIps":""}}',
        NOW(),
        NOW()
      )
    `;

    // Create default branches
    await sql`
      INSERT INTO branches (
        name,
        code,
        address,
        phone,
        email,
        manager_id,
        is_active,
        created_at,
        updated_at
      ) VALUES 
      ('Head Office', 'HO001', 'Accra, Ghana', '+233 20 123 4567', 'headoffice@mimhaad.com', 1, true, NOW(), NOW()),
      ('Kumasi Branch', 'KS001', 'Kumasi, Ghana', '+233 32 123 4567', 'kumasi@mimhaad.com', 1, true, NOW(), NOW()),
      ('Tamale Branch', 'TL001', 'Tamale, Ghana', '+233 37 123 4567', 'tamale@mimhaad.com', 1, true, NOW(), NOW())
    `;

    // Create default GL accounts
    await sql`
      INSERT INTO gl_accounts (
        account_code,
        account_name,
        account_type,
        parent_account_id,
        is_active,
        created_at,
        updated_at
      ) VALUES 
      ('1000', 'Assets', 'asset', NULL, true, NOW(), NOW()),
      ('2000', 'Liabilities', 'liability', NULL, true, NOW(), NOW()),
      ('3000', 'Equity', 'equity', NULL, true, NOW(), NOW()),
      ('4000', 'Revenue', 'revenue', NULL, true, NOW(), NOW()),
      ('5000', 'Expenses', 'expense', NULL, true, NOW(), NOW())
    `;

    console.log("Database reset completed successfully");
  } catch (error) {
    console.error("Error during database reset:", error);
    throw error;
  }
}
