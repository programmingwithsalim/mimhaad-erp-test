import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export interface AuditLogParams {
  userId: string
  username: string
  actionType: string
  entityType: string
  entityId?: string
  description: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity?: "low" | "medium" | "high" | "critical"
  branchId?: string
  branchName?: string
  status?: "success" | "failure"
  errorMessage?: string
}

export class AuditService {
  /**
   * Validate if a string is a valid UUID
   */
  private static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  /**
   * Convert non-UUID strings to null for database compatibility
   */
  private static sanitizeUUID(value?: string): string | null {
    if (!value) return null
    if (this.isValidUUID(value)) return value

    console.warn(`Invalid UUID format: ${value}, converting to null`)
    return null
  }

  /**
   * Log an audit event to the database
   */
  static async log(params: AuditLogParams): Promise<void> {
    try {
      // Validate required fields
      if (!params.username) {
        console.warn("Audit log attempted without username, skipping")
        return
      }

      // Sanitize UUID fields
      const validUserId = this.sanitizeUUID(params.userId)
      const validBranchId = this.sanitizeUUID(params.branchId)

      // Ensure audit_logs table exists
      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID,
          username VARCHAR(255) NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255),
          description TEXT NOT NULL,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          severity VARCHAR(20) DEFAULT 'low',
          branch_id UUID,
          branch_name VARCHAR(255),
          status VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Insert the audit log with proper validation
      await sql`
        INSERT INTO audit_logs (
          user_id, username, action_type, entity_type, entity_id,
          description, details, ip_address, user_agent, severity,
          branch_id, branch_name, status, error_message
        ) VALUES (
          ${validUserId}, 
          ${params.username}, 
          ${params.actionType},
          ${params.entityType}, 
          ${params.entityId || null}, 
          ${params.description},
          ${params.details ? JSON.stringify(params.details) : null},
          ${params.ipAddress || null}, 
          ${params.userAgent || null},
          ${params.severity || "low"}, 
          ${validBranchId},
          ${params.branchName || null}, 
          ${params.status || "success"},
          ${params.errorMessage || null}
        )
      `

      console.log(`Audit log created: ${params.actionType} by ${params.username}`)
    } catch (error) {
      console.error("Failed to create audit log:", error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log authentication events
   */
  static async logAuth(params: {
    userId: string
    username: string
    action: "login" | "logout" | "failed_login"
    ipAddress?: string
    userAgent?: string
    branchId?: string
    branchName?: string
    errorMessage?: string
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: params.action,
      entityType: "user",
      entityId: params.userId,
      description: `User ${params.action.replace("_", " ")}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      severity: params.action === "failed_login" ? "medium" : "low",
      branchId: params.branchId,
      branchName: params.branchName,
      status: params.action === "failed_login" ? "failure" : "success",
      errorMessage: params.errorMessage,
    })
  }

  /**
   * Log transaction events
   */
  static async logTransaction(params: {
    userId: string
    username: string
    action: "deposit" | "withdrawal" | "transfer" | "reversal"
    transactionId: string
    amount: number
    currency: string
    branchId?: string
    branchName?: string
    details?: Record<string, any>
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: `transaction_${params.action}`,
      entityType: "transaction",
      entityId: params.transactionId,
      description: `${params.action.charAt(0).toUpperCase() + params.action.slice(1)} transaction processed`,
      details: {
        amount: params.amount,
        currency: params.currency,
        ...params.details,
      },
      severity: params.amount > 10000 ? "high" : params.amount > 5000 ? "medium" : "low",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }

  /**
   * Log float management events
   */
  static async logFloat(params: {
    userId: string
    username: string
    action: "addition" | "withdrawal" | "allocation" | "adjustment"
    floatAccountId: string
    amount: number
    currency: string
    branchId?: string
    branchName?: string
    details?: Record<string, any>
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: `float_${params.action}`,
      entityType: "float_account",
      entityId: params.floatAccountId,
      description: `Float ${params.action} processed`,
      details: {
        amount: params.amount,
        currency: params.currency,
        ...params.details,
      },
      severity: params.amount > 20000 ? "critical" : params.amount > 10000 ? "high" : "medium",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }

  /**
   * Log user management events
   */
  static async logUserManagement(params: {
    userId: string
    username: string
    action: "create" | "update" | "delete" | "password_reset"
    targetUserId: string
    targetUsername: string
    branchId?: string
    branchName?: string
    details?: Record<string, any>
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: params.action,
      entityType: "user",
      entityId: params.targetUserId,
      description: `User ${params.action} for ${params.targetUsername}`,
      details: params.details,
      severity: params.action === "delete" ? "high" : "medium",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }

  /**
   * Log system configuration changes
   */
  static async logSystemConfig(params: {
    userId: string
    username: string
    configType: string
    description: string
    oldValue?: any
    newValue?: any
    branchId?: string
    branchName?: string
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: "system_config_change",
      entityType: "system_config",
      description: params.description,
      details: {
        configType: params.configType,
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
      severity: "critical",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }
}
