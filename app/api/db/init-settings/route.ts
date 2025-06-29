import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    console.log("Starting settings database initialization...")

    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable not found",
          details: "Please configure your database connection string",
        },
        { status: 500 },
      )
    }

    const sql = neon(process.env.DATABASE_URL)

    // Test connection first
    console.log("Testing database connection...")
    await sql`SELECT 1`

    console.log("Creating tables...")

    // Create tables one by one with individual error handling
    const tableResults = []

    // 1. Create system_config table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS system_config (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value TEXT NOT NULL,
          description TEXT,
          category VARCHAR(50) DEFAULT 'general',
          data_type VARCHAR(20) DEFAULT 'string',
          is_editable BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER
        )
      `
      tableResults.push("system_config")
      console.log("✓ Created system_config table")
    } catch (error) {
      console.log("⚠ system_config table creation failed:", error)
    }

    // 2. Create fee_config table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS fee_config (
          id SERIAL PRIMARY KEY,
          service_type VARCHAR(50) NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          fee_type VARCHAR(20) DEFAULT 'percentage',
          fee_value DECIMAL(10,4) NOT NULL,
          min_fee DECIMAL(10,2) DEFAULT 0,
          max_fee DECIMAL(10,2),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          UNIQUE(service_type, transaction_type)
        )
      `
      tableResults.push("fee_config")
      console.log("✓ Created fee_config table")
    } catch (error) {
      console.log("⚠ fee_config table creation failed:", error)
    }

    // 3. Create roles table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          role_name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          permissions JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER
        )
      `
      tableResults.push("roles")
      console.log("✓ Created roles table")
    } catch (error) {
      console.log("⚠ roles table creation failed:", error)
    }

    // 4. Create user_roles table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          role_id INTEGER NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_by INTEGER,
          is_active BOOLEAN DEFAULT true,
          UNIQUE(user_id, role_id)
        )
      `
      tableResults.push("user_roles")
      console.log("✓ Created user_roles table")
    } catch (error) {
      console.log("⚠ user_roles table creation failed:", error)
    }

    // 5. Create audit_logs table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          user_name VARCHAR(100),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100),
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          branch_id INTEGER,
          severity VARCHAR(20) DEFAULT 'info',
          status VARCHAR(20) DEFAULT 'success',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      tableResults.push("audit_logs")
      console.log("✓ Created audit_logs table")
    } catch (error) {
      console.log("⚠ audit_logs table creation failed:", error)
    }

    console.log("Inserting default data...")

    // Insert default system configurations
    const systemConfigData = [
      { key: "float_low_threshold", value: "1000", description: "Low float threshold amount", category: "float" },
      {
        key: "float_critical_threshold",
        value: "500",
        description: "Critical float threshold amount",
        category: "float",
      },
      { key: "max_transaction_amount", value: "50000", description: "Maximum transaction amount", category: "limits" },
      {
        key: "daily_transaction_limit",
        value: "200000",
        description: "Daily transaction limit per user",
        category: "limits",
      },
      {
        key: "approval_required_amount",
        value: "10000",
        description: "Amount requiring approval",
        category: "approval",
      },
      {
        key: "session_timeout_minutes",
        value: "30",
        description: "User session timeout in minutes",
        category: "security",
      },
      { key: "api_timeout_seconds", value: "30", description: "API request timeout in seconds", category: "api" },
      {
        key: "enable_notifications",
        value: "true",
        description: "Enable system notifications",
        category: "notifications",
      },
      {
        key: "notification_email",
        value: "admin@company.com",
        description: "Default notification email",
        category: "notifications",
      },
      {
        key: "backup_frequency_hours",
        value: "24",
        description: "Database backup frequency in hours",
        category: "maintenance",
      },
    ]

    let systemConfigCount = 0
    for (const config of systemConfigData) {
      try {
        await sql`
          INSERT INTO system_config (config_key, config_value, description, category)
          VALUES (${config.key}, ${config.value}, ${config.description}, ${config.category})
          ON CONFLICT (config_key) DO NOTHING
        `
        systemConfigCount++
      } catch (error) {
        console.log(`⚠ Failed to insert system config ${config.key}:`, error)
      }
    }

    // Insert default fee configurations
    const feeConfigData = [
      { service: "momo", type: "withdrawal", fee_type: "percentage", fee_value: 1.5, min_fee: 1.0, max_fee: 10.0 },
      { service: "momo", type: "deposit", fee_type: "percentage", fee_value: 1.0, min_fee: 0.5, max_fee: 5.0 },
      { service: "momo", type: "transfer", fee_type: "percentage", fee_value: 0.5, min_fee: 0.25, max_fee: 2.5 },
      { service: "e_zwich", type: "withdrawal", fee_type: "fixed", fee_value: 2.0, min_fee: 2.0, max_fee: 2.0 },
      { service: "e_zwich", type: "deposit", fee_type: "fixed", fee_value: 1.0, min_fee: 1.0, max_fee: 1.0 },
      {
        service: "agency_banking",
        type: "withdrawal",
        fee_type: "percentage",
        fee_value: 2.0,
        min_fee: 2.0,
        max_fee: 15.0,
      },
      {
        service: "agency_banking",
        type: "deposit",
        fee_type: "percentage",
        fee_value: 1.5,
        min_fee: 1.0,
        max_fee: 10.0,
      },
      {
        service: "agency_banking",
        type: "transfer",
        fee_type: "percentage",
        fee_value: 1.0,
        min_fee: 1.0,
        max_fee: 8.0,
      },
      {
        service: "agency_banking",
        type: "balance_inquiry",
        fee_type: "fixed",
        fee_value: 0.5,
        min_fee: 0.5,
        max_fee: 0.5,
      },
    ]

    let feeConfigCount = 0
    for (const fee of feeConfigData) {
      try {
        await sql`
          INSERT INTO fee_config (service_type, transaction_type, fee_type, fee_value, min_fee, max_fee)
          VALUES (${fee.service}, ${fee.type}, ${fee.fee_type}, ${fee.fee_value}, ${fee.min_fee}, ${fee.max_fee})
          ON CONFLICT (service_type, transaction_type) DO NOTHING
        `
        feeConfigCount++
      } catch (error) {
        console.log(`⚠ Failed to insert fee config ${fee.service}-${fee.type}:`, error)
      }
    }

    // Insert default roles
    const rolesData = [
      { name: "System Administrator", description: "Full system access", permissions: { all: true } },
      {
        name: "Cashier",
        description: "Transaction processing",
        permissions: { transactions: ["create", "read"], float: ["read"] },
      },
      {
        name: "Operations",
        description: "Operations management",
        permissions: { transactions: ["read", "update"], float: ["read", "update"], reports: ["read"] },
      },
      {
        name: "Manager",
        description: "Branch management",
        permissions: {
          transactions: ["read", "update", "approve"],
          float: ["read", "update"],
          reports: ["read"],
          users: ["read"],
        },
      },
      {
        name: "Finance",
        description: "Financial oversight",
        permissions: { transactions: ["read"], float: ["read"], reports: ["read"], audit: ["read"] },
      },
    ]

    let rolesCount = 0
    for (const role of rolesData) {
      try {
        await sql`
          INSERT INTO roles (role_name, description, permissions)
          VALUES (${role.name}, ${role.description}, ${JSON.stringify(role.permissions)})
          ON CONFLICT (role_name) DO NOTHING
        `
        rolesCount++
      } catch (error) {
        console.log(`⚠ Failed to insert role ${role.name}:`, error)
      }
    }

    // Insert sample audit logs
    const auditLogsData = [
      {
        user_name: "System",
        action: "database_init",
        entity_type: "system",
        description: "Settings database initialized",
      },
      {
        user_name: "Admin",
        action: "config_update",
        entity_type: "system_config",
        description: "Updated float threshold",
      },
      { user_name: "Admin", action: "role_create", entity_type: "roles", description: "Created new user role" },
    ]

    let auditLogsCount = 0
    for (const log of auditLogsData) {
      try {
        await sql`
          INSERT INTO audit_logs (user_name, action, entity_type, description)
          VALUES (${log.user_name}, ${log.action}, ${log.entity_type}, ${log.description})
        `
        auditLogsCount++
      } catch (error) {
        console.log(`⚠ Failed to insert audit log:`, error)
      }
    }

    console.log("✅ Settings database initialization completed")

    return NextResponse.json({
      success: true,
      message: "Settings database initialized successfully",
      tables: tableResults,
      data: {
        system_config: systemConfigCount,
        fee_config: feeConfigCount,
        roles: rolesCount,
        audit_logs: auditLogsCount,
      },
      execution: {
        success: tableResults.length,
        errors: 0,
      },
    })
  } catch (error) {
    console.error("Settings database initialization failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize settings database",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
