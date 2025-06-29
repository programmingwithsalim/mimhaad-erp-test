import { NextResponse } from "next/server"
import { AuditService } from "@/lib/audit-service"
import { SettingsService } from "@/lib/settings-service"

export async function POST() {
  try {
    // Initialize settings tables
    await SettingsService.initializeTables()

    // Seed default settings and fees
    await SettingsService.seedDefaultSettings()

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
