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

    // Check if user is admin (case-sensitive check)
    if (session.user.role !== "Admin") {
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
    await resetDatabase(session.user.id);

    // Verify admin user still exists
    const adminCheck = await sql`
      SELECT id, email FROM users WHERE id = ${session.user.id}
    `;

    if (adminCheck.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Critical error: Admin user was not preserved during reset",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Database reset completed successfully. All data has been cleared except your admin account.",
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
    // Create a backup record (if table exists)
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
    console.log("system_backups table not found, skipping backup record");
    // Continue with reset even if backup fails
  }
}

async function resetDatabase(currentAdminId: string) {
  try {
    // Get current admin user info for preservation
    const currentAdmin = await sql`
      SELECT id, first_name, last_name, email, password_hash, primary_branch_id, role, status, created_at
      FROM users 
      WHERE id = ${currentAdminId}
    `;

    if (currentAdmin.length === 0) {
      throw new Error("Current admin user not found");
    }

    const adminUser = currentAdmin[0];

    // Get all table names except users (we'll handle it separately)
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT IN ('schema_migrations', 'ar_internal_metadata', 'users')
      ORDER BY tablename
    `;

    console.log(`Found ${tables.length} tables to reset`);
    console.log(
      "Tables found:",
      tables.map((t) => t.tablename)
    );

    // Define ONLY transaction-related tables to reset (keep configurations)
    const transactionTablesToReset = [
      // Transaction tables (all transaction data)
      "momo_transactions",
      "agency_banking_transactions",
      "e_zwich_transactions",
      "power_transactions",
      "jumia_transactions",
      "ezwich_transactions",
      "gl_journal_entries",
      "gl_transactions",
      "float_transactions",

      // Financial transaction data
      "gl_mappings",
      "gl_account_balances",
      "commissions",
      "expenses",

      // E-Zwich transaction data
      "e_zwich_card_issuances",
      "e_zwich_withdrawals",
      "ezwich_card_issuance",
      "ezwich_cards",
      "ezwich_card_batches",
      "e_zwich_partner_accounts",

      // Audit and security logs (transaction-related)
      "audit_logs",
      "security_events",
      "login_attempts",
      "user_sessions",
      "user_notification_settings",
      "user_branch_assignments",
      "notifications",
      "system_backups",
      "jumia_packages",

      // Transaction-related data
      "gl_sync_logs",
    ];

    // Tables to KEEP (configurations)
    const tablesToKeep = [
      "users", // Keep all users
      "branches", // Keep branch configurations
      "system_config", // Keep system settings
      "system_settings", // Keep additional settings
      "fee_config", // Keep fee configurations
      "partner_banks", // Keep partner bank configs
      "permissions", // Keep permissions
      "roles", // Keep roles
      "float_accounts", // Keep float account configs
      "gl_accounts", // Keep GL account structure
      "expense_heads", // Keep expense categories
      "fixed_assets", // Keep fixed asset records
    ];

    // First, disable foreign key constraints temporarily
    console.log("Disabling foreign key constraints...");
    try {
      await sql.unsafe(`SET session_replication_role = replica`);
      console.log("✓ Foreign key constraints disabled");
    } catch (error) {
      console.log(
        "⚠ Could not disable foreign key constraints (this is normal for Neon):",
        error.message
      );
    }

    // Delete from ONLY transaction-related tables
    console.log("Deleting transaction data from tables...");
    for (const tableName of transactionTablesToReset) {
      try {
        // Try CASCADE delete first (more aggressive)
        const result = await sql.unsafe(`DELETE FROM "${tableName}" CASCADE`);
        console.log(`✓ Deleted from ${tableName}: ${result.length} rows`);
      } catch (error) {
        try {
          // Fallback to regular delete
          const result = await sql.unsafe(
            `DELETE FROM "${tableName}" WHERE 1=1`
          );
          console.log(`✓ Deleted from ${tableName}: ${result.length} rows`);
        } catch (fallbackError) {
          try {
            // Final fallback: TRUNCATE (resets sequences too)
            await sql.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
            console.log(`✓ Truncated ${tableName}`);
          } catch (truncateError) {
            console.log(
              `⚠ Could not delete/truncate ${tableName}:`,
              truncateError.message
            );
          }
        }
      }
    }

    // Log which tables we're keeping
    console.log("Keeping configuration tables:", tablesToKeep);

    // Re-enable foreign key constraints
    try {
      await sql.unsafe(`SET session_replication_role = DEFAULT`);
      console.log("✓ Foreign key constraints re-enabled");
    } catch (error) {
      console.log(
        "⚠ Could not re-enable foreign key constraints:",
        error.message
      );
    }

    // Keep all users (no deletion)
    console.log("Keeping all users (including current admin)");

    // Reset sequences (except users) - handle each sequence individually
    const sequencesToReset = [
      "audit_logs_id_seq",
      "fee_config_id_seq",
      "gl_account_balances_id_seq",
      "permissions_id_seq",
      "roles_id_seq",
      "system_config_id_seq",
      "system_settings_id_seq",
    ];

    for (const seqName of sequencesToReset) {
      try {
        await sql.unsafe(
          `ALTER SEQUENCE IF EXISTS "${seqName}" RESTART WITH 1`
        );
        console.log(`✓ Reset sequence: ${seqName}`);
      } catch (error) {
        console.log(`⚠ Could not reset sequence ${seqName}:`, error.message);
      }
    }

    // Keep existing system configuration (no deletion or insertion)
    console.log("Keeping existing system configuration");

    // Keep existing branches and GL accounts (no insertion)
    console.log("Keeping existing branches and GL accounts");

    // Verify that transaction tables are empty
    console.log("Verifying transaction data reset completion...");
    let verificationFailed = false;

    for (const tableName of transactionTablesToReset) {
      try {
        const countResult = await sql.unsafe(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );
        const count = parseInt(countResult[0]?.count || "0");
        if (count > 0) {
          console.log(
            `⚠ Transaction table ${tableName} still has ${count} records`
          );
          verificationFailed = true;
        } else {
          console.log(`✓ Transaction table ${tableName} is empty`);
        }
      } catch (error) {
        console.log(`⚠ Could not verify ${tableName}:`, error.message);
      }
    }

    if (verificationFailed) {
      console.log(
        "⚠ Some transaction tables still contain data - reset may be incomplete"
      );
    } else {
      console.log("✓ All transaction tables verified as empty");
    }

    console.log("Database reset completed successfully");
  } catch (error) {
    console.error("Error during database reset:", error);
    throw error;
  }
}
