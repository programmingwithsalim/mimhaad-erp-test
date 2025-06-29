import type { NextRequest } from "next/server"
import { getSession } from "./auth-service"
import { PERMISSIONS, TRANSACTION_LIMITS } from "./rbac-permissions"

export async function checkPermission(
  request: NextRequest,
  requiredPermission: string,
  transactionAmount?: number,
): Promise<{ authorized: boolean; user?: any; reason?: string }> {
  try {
    const session = await getSession(request)

    if (!session) {
      return { authorized: false, reason: "No active session" }
    }

    const userRole = session.role

    // Admin has all permissions
    if (userRole === "admin") {
      return { authorized: true, user: session }
    }

    // Check if user has the required permission
    const rolePermissions = getRolePermissions(userRole)
    const hasPermission = rolePermissions.includes(requiredPermission) || rolePermissions.includes("*")

    if (!hasPermission) {
      return {
        authorized: false,
        reason: `Role '${userRole}' does not have permission '${requiredPermission}'`,
      }
    }

    // Check transaction limits if amount is provided
    if (transactionAmount && transactionAmount > 0) {
      const limits = TRANSACTION_LIMITS[userRole as keyof typeof TRANSACTION_LIMITS]
      if (limits && transactionAmount > limits.maxSingleTransaction) {
        return {
          authorized: false,
          reason: `Transaction amount ${transactionAmount} exceeds limit ${limits.maxSingleTransaction} for role '${userRole}'`,
        }
      }
    }

    return { authorized: true, user: session }
  } catch (error) {
    console.error("Permission check error:", error)
    return { authorized: false, reason: "Permission check failed" }
  }
}

function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    cashier: [
      PERMISSIONS.MOMO_PROCESS,
      PERMISSIONS.AGENCY_PROCESS,
      PERMISSIONS.EZWICH_PROCESS,
      PERMISSIONS.PAYMENTS_PROCESS,
      PERMISSIONS.RECEIPTS_PROCESS,
      PERMISSIONS.TILL_VIEW,
      PERMISSIONS.CASH_VIEW,
    ],
    operations: [
      PERMISSIONS.TRANSACTIONS_INITIATE,
      PERMISSIONS.TRANSACTIONS_VERIFY,
      PERMISSIONS.CUSTOMERS_VERIFY,
      PERMISSIONS.TRANSACTIONS_VIEW,
      PERMISSIONS.TRANSFERS_SMALL,
      PERMISSIONS.FLOAT_REQUEST,
    ],
    manager: [
      PERMISSIONS.TRANSACTIONS_APPROVE,
      PERMISSIONS.TRANSFERS_LARGE,
      PERMISSIONS.TRANSFERS_APPROVE,
      PERMISSIONS.FUNDS_TRANSFER,
      PERMISSIONS.WALLETS_TRANSFER,
      PERMISSIONS.BANKS_TRANSFER,
      PERMISSIONS.OPERATIONS_OVERRIDE,
      PERMISSIONS.FLOAT_APPROVE,
      PERMISSIONS.USERS_MANAGE,
    ],
    finance: [
      PERMISSIONS.REPORTS_ALL,
      PERMISSIONS.ACCOUNTS_RECONCILE,
      PERMISSIONS.AUDIT_ACCESS,
      PERMISSIONS.GL_MANAGE,
      PERMISSIONS.FINANCIAL_REPORTS,
      PERMISSIONS.RECONCILIATION_ALL,
      PERMISSIONS.STATEMENTS_GENERATE,
    ],
  }

  return rolePermissions[role] || []
}
