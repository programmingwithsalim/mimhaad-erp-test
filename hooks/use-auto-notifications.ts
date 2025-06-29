"use client"

import { useNotificationMiddleware } from "@/lib/services/notification-middleware"
import { useCallback } from "react"

export function useAutoNotifications() {
  const middleware = useNotificationMiddleware()

  // Transaction completion notification
  const notifyTransactionComplete = useCallback(
    async (transactionData: {
      type: string
      operation: string
      amount: number
      customerPhone?: string
      customerEmail?: string
      customerName?: string
      reference?: string
    }) => {
      await middleware.notifyTransaction({
        ...transactionData,
        status: "completed",
      })
    },
    [middleware],
  )

  // User management notifications
  const notifyUserChange = useCallback(
    async (changeType: "created" | "updated" | "role_changed", userEmail: string, description: string) => {
      await middleware.notifySystemChange({
        type: changeType === "created" ? "user_created" : changeType === "updated" ? "user_updated" : "role_changed",
        description,
        affectedUserEmail: userEmail,
        performedBy: "System Administrator", // You can pass the actual user
      })
    },
    [middleware],
  )

  // Float management notifications
  const notifyFloatChange = useCallback(
    async (accountName: string, amount: number, operation: string) => {
      await middleware.notifySystemChange({
        type: "float_allocated",
        description: `Float ${operation}: GHS ${amount} for ${accountName}`,
        performedBy: "System Administrator",
      })
    },
    [middleware],
  )

  // Expense approval notifications
  const notifyExpenseApproval = useCallback(
    async (expenseId: string, amount: number, status: "approved" | "rejected") => {
      await middleware.notifySystemChange({
        type: "expense_approved",
        description: `Expense ${expenseId} (GHS ${amount}) has been ${status}`,
        performedBy: "System Administrator",
      })
    },
    [middleware],
  )

  // Low balance check
  const checkAndNotifyLowBalance = useCallback(
    async (accountName: string, currentBalance: number, threshold: number, branchId: string) => {
      if (currentBalance <= threshold) {
        await middleware.notifyLowBalance({
          accountName,
          currentBalance,
          threshold,
          branchId,
        })
      }
    },
    [middleware],
  )

  return {
    notifyTransactionComplete,
    notifyUserChange,
    notifyFloatChange,
    notifyExpenseApproval,
    checkAndNotifyLowBalance,
  }
}
