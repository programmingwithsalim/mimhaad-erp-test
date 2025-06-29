export interface ClientAuditLogParams {
  userId: string
  username: string
  actionType: string
  entityType: string
  entityId?: string
  description: string
  details?: Record<string, any>
  severity?: "low" | "medium" | "high" | "critical"
  branchId?: string
  branchName?: string
  status?: "success" | "failure"
  errorMessage?: string
}

export class ClientAuditService {
  /**
   * Log an audit event via API call
   */
  static async log(params: ClientAuditLogParams): Promise<void> {
    try {
      await fetch("/api/audit/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })
    } catch (error) {
      console.error("Failed to log audit event:", error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log transaction events
   */
  static async logTransaction(params: {
    userId: string
    username: string
    action: "cash-in" | "cash-out" | "reversal"
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
      actionType: `momo_${params.action}`,
      entityType: "momo_transaction",
      entityId: params.transactionId,
      description: `MoMo ${params.action.replace("-", " ")} transaction processed`,
      details: {
        amount: params.amount,
        currency: params.currency,
        provider: params.details?.provider,
        ...params.details,
      },
      severity: params.amount > 10000 ? "high" : params.amount > 5000 ? "medium" : "low",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }

  /**
   * Log system access events
   */
  static async logAccess(params: {
    userId: string
    username: string
    action: "page_access" | "feature_access"
    resource: string
    branchId?: string
    branchName?: string
  }): Promise<void> {
    await this.log({
      userId: params.userId,
      username: params.username,
      actionType: params.action,
      entityType: "system_access",
      description: `User accessed ${params.resource}`,
      severity: "low",
      branchId: params.branchId,
      branchName: params.branchName,
    })
  }
}
