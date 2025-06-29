"use client"

import { useNotifications } from "@/hooks/use-notifications"
import { useFeeConfig } from "@/hooks/use-fee-config"
import { useAuth } from "@/lib/auth-context"
import { useState, useCallback } from "react"

interface TransactionData {
  type: string
  operation: string
  amount: number
  customerInfo?: {
    email?: string
    phone?: string
    name?: string
  }
  branchId?: string
}

interface FeeCalculation {
  baseAmount: number
  feeAmount: number
  totalAmount: number
  feeType: "percentage" | "fixed"
  feeRate: number
}

export function useAppServices() {
  const { user } = useAuth()
  const { sendNotification, preferences, loadPreferences } = useNotifications()
  const { calculateFee, feeConfig, loadFeeConfig } = useFeeConfig()
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate transaction fee
  const calculateTransactionFee = useCallback(
    (serviceType: string, operation: string, amount: number): FeeCalculation => {
      const fee = calculateFee(serviceType, operation, amount)
      return {
        baseAmount: amount,
        feeAmount: fee,
        totalAmount: amount + fee,
        feeType: feeConfig?.[serviceType]?.[operation]?.type || "fixed",
        feeRate: feeConfig?.[serviceType]?.[operation]?.rate || 0,
      }
    },
    [calculateFee, feeConfig],
  )

  // Process transaction with automatic fee calculation and notifications
  const processTransaction = useCallback(
    async (type: string, operation: string, amount: number, customerInfo?: TransactionData["customerInfo"]) => {
      setIsProcessing(true)
      try {
        // Calculate fees
        const feeCalculation = calculateTransactionFee(type, operation, amount)

        // Send transaction notification if enabled
        if (preferences?.transactionAlerts) {
          await sendNotification({
            type: "transaction",
            title: `${type.toUpperCase()} ${operation}`,
            message: `Transaction of GHS ${amount} processed. Fee: GHS ${feeCalculation.feeAmount}`,
            email: customerInfo?.email || user?.email,
            phone: customerInfo?.phone || user?.phone,
            userId: user?.id,
          })
        }

        return {
          success: true,
          feeCalculation,
          transactionId: `TXN_${Date.now()}`,
        }
      } catch (error) {
        console.error("Transaction processing failed:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Transaction failed",
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [calculateTransactionFee, preferences, sendNotification, user],
  )

  // Check float balance and send alerts
  const checkFloatBalance = useCallback(
    async (accountName: string, currentBalance: number, threshold: number) => {
      if (currentBalance <= threshold && preferences?.systemAlerts) {
        await sendNotification({
          type: "system",
          title: "Low Float Balance Alert",
          message: `${accountName} balance (GHS ${currentBalance}) is below threshold (GHS ${threshold})`,
          email: user?.email,
          phone: user?.phone,
          userId: user?.id,
        })
      }
    },
    [preferences, sendNotification, user],
  )

  // Send security notification
  const sendSecurityAlert = useCallback(
    async (message: string) => {
      if (preferences?.securityAlerts) {
        await sendNotification({
          type: "security",
          title: "Security Alert",
          message,
          email: user?.email,
          phone: user?.phone,
          userId: user?.id,
        })
      }
    },
    [preferences, sendNotification, user],
  )

  // Send system update notification
  const sendSystemUpdate = useCallback(
    async (message: string) => {
      if (preferences?.systemAlerts) {
        await sendNotification({
          type: "system",
          title: "System Update",
          message,
          email: user?.email,
          phone: user?.phone,
          userId: user?.id,
        })
      }
    },
    [preferences, sendNotification, user],
  )

  return {
    // Fee calculation
    calculateTransactionFee,
    feeConfig,
    loadFeeConfig,

    // Transaction processing
    processTransaction,
    isProcessing,

    // Notifications
    sendNotification,
    preferences,
    loadPreferences,
    checkFloatBalance,
    sendSecurityAlert,
    sendSystemUpdate,

    // User context
    user,
  }
}
