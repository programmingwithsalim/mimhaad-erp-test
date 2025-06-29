import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create the audit_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        username VARCHAR(255) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        description TEXT NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        branch_id VARCHAR(255),
        branch_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
        error_message TEXT,
        related_entities JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON audit_logs(branch_id)`

    // Clear existing data
    await sql`DELETE FROM audit_logs`

    // Insert comprehensive sample audit log data
    const sampleLogs = [
      // Authentication logs
      {
        user_id: "1",
        username: "admin",
        action_type: "login",
        entity_type: "user",
        entity_id: "1",
        description: "Administrator logged in successfully",
        details: { ip_address: "192.168.1.100", browser: "Chrome 120.0" },
        severity: "low",
        branch_id: "1",
        branch_name: "Accra Main Branch",
        status: "success",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        user_id: "2",
        username: "manager1",
        action_type: "login",
        entity_type: "user",
        entity_id: "2",
        description: "Branch Manager logged in successfully",
        details: { ip_address: "192.168.1.101", browser: "Firefox 121.0" },
        severity: "low",
        branch_id: "2",
        branch_name: "Kumasi Branch",
        status: "success",
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours ago
      },
      {
        user_id: "unknown",
        username: "hacker123",
        action_type: "failed_login_attempt",
        entity_type: "user",
        description: "Failed login attempt with invalid credentials",
        details: { ip_address: "203.0.113.45", browser: "Unknown", attempts: 3 },
        severity: "high",
        status: "failure",
        error_message: "Invalid username or password",
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      },

      // Transaction logs
      {
        user_id: "3",
        username: "cashier1",
        action_type: "transaction_deposit",
        entity_type: "transaction",
        entity_id: "TXN001",
        description: "Customer deposit transaction processed",
        details: {
          amount: 1500.0,
          currency: "GHS",
          customer_id: "CUST001",
          account_number: "ACC123456",
          reference: "DEP001",
        },
        severity: "medium",
        branch_id: "1",
        branch_name: "Accra Main Branch",
        status: "success",
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      },
      {
        user_id: "3",
        username: "cashier1",
        action_type: "transaction_withdrawal",
        entity_type: "transaction",
        entity_id: "TXN002",
        description: "Customer withdrawal transaction processed",
        details: {
          amount: 800.0,
          currency: "GHS",
          customer_id: "CUST002",
          account_number: "ACC789012",
          reference: "WTH001",
        },
        severity: "medium",
        branch_id: "1",
        branch_name: "Accra Main Branch",
        status: "success",
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      },
      {
        user_id: "4",
        username: "supervisor1",
        action_type: "transaction_reversal",
        entity_type: "transaction",
        entity_id: "TXN003",
        description: "Transaction reversal approved by supervisor",
        details: {
          original_amount: 2000.0,
          currency: "GHS",
          reason: "Customer dispute",
          original_transaction: "TXN001",
        },
        severity: "high",
        branch_id: "1",
        branch_name: "Accra Main Branch",
        status: "success",
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
      },

      // Float management logs
      {
        user_id: "2",
        username: "manager1",
        action_type: "float_addition",
        entity_type: "float_account",
        entity_id: "FLOAT001",
        description: "Float account replenishment",
        details: {
          amount: 10000.0,
          currency: "GHS",
          float_type: "MoMo",
          previous_balance: 5000.0,
          new_balance: 15000.0,
        },
        severity: "high",
        branch_id: "2",
        branch_name: "Kumasi Branch",
        status: "success",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      },
      {
        user_id: "5",
        username: "operator1",
        action_type: "float_allocation",
        entity_type: "float_account",
        entity_id: "FLOAT002",
        description: "Float allocated to branch operations",
        details: {
          amount: 3000.0,
          currency: "GHS",
          float_type: "Agency Banking",
          allocated_to: "Daily Operations",
        },
        severity: "medium",
        branch_id: "3",
        branch_name: "Takoradi Branch",
        status: "success",
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      },

      // Export logs
      {
        user_id: "1",
        username: "admin",
        action_type: "export_data",
        entity_type: "report",
        description: "Transaction data exported to CSV",
        details: {
          export_type: "transactions",
          format: "CSV",
          date_range: "2024-01-01 to 2024-01-31",
          record_count: 1250,
          file_size: "2.5MB",
        },
        severity: "medium",
        branch_id: "1",
        branch_name: "Accra Main Branch",
        status: "success",
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      },
      {
        user_id: "2",
        username: "manager1",
        action_type: "export_report",
        entity_type: "report",
        description: "Monthly commission report exported",
        details: {
          export_type: "commissions",
          format: "PDF",
          month: "January 2024",
          total_commissions: 15750.0,
        },
        severity: "low",
        branch_id: "2",
        branch_name: "Kumasi Branch",
        status: "success",
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
      },

      // System configuration logs
      {
        user_id: "1",
        username: "admin",
        action_type: "system_config_change",
        entity_type: "system_config",
        description: "Updated transaction limits configuration",
        details: {
          setting: "daily_transaction_limit",
          old_value: 50000,
          new_value: 75000,
          currency: "GHS",
        },
        severity: "critical",
        status: "success",
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      },

      // User management logs
      {
        user_id: "1",
        username: "admin",
        action_type: "create",
        entity_type: "user",
        entity_id: "6",
        description: "New user account created",
        details: {
          new_username: "cashier2",
          role: "Cashier",
          branch_assigned: "Cape Coast Branch",
          permissions: ["transaction_processing", "customer_service"],
        },
        severity: "medium",
        branch_id: "4",
        branch_name: "Cape Coast Branch",
        status: "success",
        created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
      },

      // Recent critical event
      {
        user_id: "system",
        username: "system",
        action_type: "system_error",
        entity_type: "system_config",
        description: "Database connection timeout detected",
        details: {
          error_type: "connection_timeout",
          affected_services: ["transaction_processing", "user_authentication"],
          duration: "30 seconds",
          auto_recovery: true,
        },
        severity: "critical",
        status: "failure",
        error_message: "Connection pool exhausted - auto-recovery initiated",
        created_at: new Date().toISOString(), // Just now
      },
    ]

    // Insert all sample logs
    for (const log of sampleLogs) {
      await sql`
        INSERT INTO audit_logs (
          user_id, username, action_type, entity_type, entity_id,
          description, details, severity, branch_id, branch_name,
          status, error_message, created_at
        ) VALUES (
          ${log.user_id}, ${log.username}, ${log.action_type}, 
          ${log.entity_type}, ${log.entity_id || null}, ${log.description},
          ${JSON.stringify(log.details)}, ${log.severity}, 
          ${log.branch_id || null}, ${log.branch_name || null},
          ${log.status}, ${log.error_message || null}, ${log.created_at}
        )
      `
    }

    // Get count of inserted records
    const count = await sql`SELECT COUNT(*) as total FROM audit_logs`

    return NextResponse.json({
      success: true,
      message: `Audit logs table initialized successfully with ${count[0].total} sample entries`,
      data: {
        table_created: true,
        indexes_created: true,
        sample_data_inserted: true,
        total_records: count[0].total,
      },
    })
  } catch (error) {
    console.error("Error initializing audit logs:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize audit logs table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
