"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

export interface NotificationPreferences {
  emailNotifications: boolean
  emailAddress: string
  smsNotifications: boolean
  phoneNumber: string
  pushNotifications: boolean
  transactionAlerts: boolean
  floatThresholdAlerts: boolean
  systemUpdates: boolean
  securityAlerts: boolean
  dailyReports: boolean
  weeklyReports: boolean
  loginAlerts: boolean
  marketingEmails: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  alertFrequency: "immediate" | "hourly" | "daily"
  reportFrequency: "daily" | "weekly" | "monthly"
}

export interface NotificationData {
  userName?: string
  transactionDetails?: {
    amount: number
    type: string
    reference: string
    timestamp: string
  }
  accountType?: string
  currentBalance?: number
  threshold?: number
  resetLink?: string
  message?: string
}

export interface NotificationRecipient {
  email?: string
  phone?: string
  userId?: string
}

export interface Notification {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
  timestamp: Date
}

export function useNotifications() {
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useAuth()
  const { toast } = useToast()

  // Load user notification preferences
  const loadPreferences = useCallback(
    async (userId?: string) => {
      if (!userId && !user?.id) return null

      try {
        setIsLoading(true)
        const response = await fetch(`/api/users/${userId || user?.id}/notification-settings`)

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setPreferences(result.data)
            return result.data
          }
        }
        return null
      } catch (error) {
        console.error("Error loading notification preferences:", error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id],
  )

  // Save user notification preferences
  const savePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>, userId?: string) => {
      if (!userId && !user?.id) return false

      try {
        setIsLoading(true)
        const response = await fetch(`/api/users/${userId || user?.id}/notification-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPreferences),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setPreferences((prev) => (prev ? { ...prev, ...newPreferences } : null))
            return true
          }
        }
        return false
      } catch (error) {
        console.error("Error saving notification preferences:", error)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [user?.id],
  )

  // Send notification based on user preferences
  const sendNotification = useCallback(
    async (
      type: "welcome" | "password-reset" | "transaction-alert" | "low-balance" | "security-alert" | "system-update",
      recipient: NotificationRecipient,
      data: NotificationData = {},
    ) => {
      try {
        // Load recipient preferences if userId is provided
        let recipientPrefs = preferences
        if (recipient.userId && recipient.userId !== user?.id) {
          recipientPrefs = await loadPreferences(recipient.userId)
        }

        // Check if user wants this type of notification
        if (recipientPrefs) {
          const shouldSendEmail =
            recipientPrefs.emailNotifications &&
            (type === "transaction-alert"
              ? recipientPrefs.transactionAlerts
              : type === "security-alert"
                ? recipientPrefs.securityAlerts
                : type === "system-update"
                  ? recipientPrefs.systemUpdates
                  : true)

          const shouldSendSms =
            recipientPrefs.smsNotifications &&
            (type === "transaction-alert"
              ? recipientPrefs.transactionAlerts
              : type === "security-alert"
                ? recipientPrefs.securityAlerts
                : false) // SMS only for critical alerts

          // Override recipient contact info with preferences if available
          if (!shouldSendEmail) recipient.email = undefined
          if (!shouldSendSms) recipient.phone = undefined

          if (recipientPrefs.emailAddress) recipient.email = recipientPrefs.emailAddress
          if (recipientPrefs.phoneNumber) recipient.phone = recipientPrefs.phoneNumber
        }

        // Don't send if no contact method is available
        if (!recipient.email && !recipient.phone) {
          return { success: false, message: "No contact method available or notifications disabled" }
        }

        // Check quiet hours
        if (recipientPrefs?.quietHoursEnabled && (type === "transaction-alert" || type === "low-balance")) {
          const now = new Date()
          const currentTime = now.getHours() * 100 + now.getMinutes()
          const quietStart = Number.parseInt(recipientPrefs.quietHoursStart.replace(":", ""))
          const quietEnd = Number.parseInt(recipientPrefs.quietHoursEnd.replace(":", ""))

          if (quietStart > quietEnd) {
            // Quiet hours span midnight
            if (currentTime >= quietStart || currentTime <= quietEnd) {
              return { success: false, message: "Notification suppressed due to quiet hours" }
            }
          } else {
            // Normal quiet hours
            if (currentTime >= quietStart && currentTime <= quietEnd) {
              return { success: false, message: "Notification suppressed due to quiet hours" }
            }
          }
        }

        const response = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, recipient, data }),
        })

        if (response.ok) {
          const result = await response.json()
          return result
        } else {
          throw new Error("Failed to send notification")
        }
      } catch (error) {
        console.error("Error sending notification:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      }
    },
    [preferences, user?.id, loadPreferences],
  )

  // Convenience methods for common notifications
  const sendTransactionAlert = useCallback(
    (recipient: NotificationRecipient, transactionDetails: NotificationData["transactionDetails"]) => {
      return sendNotification("transaction-alert", recipient, {
        userName: recipient.userId ? "User" : "Customer",
        transactionDetails,
      })
    },
    [sendNotification],
  )

  const sendLowBalanceAlert = useCallback(
    (recipient: NotificationRecipient, accountType: string, currentBalance: number, threshold: number) => {
      return sendNotification("low-balance", recipient, {
        userName: recipient.userId ? "User" : "Customer",
        accountType,
        currentBalance,
        threshold,
      })
    },
    [sendNotification],
  )

  const sendSecurityAlert = useCallback(
    (recipient: NotificationRecipient, message: string) => {
      return sendNotification("security-alert", recipient, {
        userName: recipient.userId ? "User" : "Customer",
        message,
      })
    },
    [sendNotification],
  )

  const sendSystemUpdate = useCallback(
    (recipient: NotificationRecipient, message: string) => {
      return sendNotification("system-update", recipient, {
        userName: recipient.userId ? "User" : "Customer",
        message,
      })
    },
    [sendNotification],
  )

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }
    setNotifications((prev) => [newNotification, ...prev])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    preferences,
    isLoading,
    loadPreferences,
    savePreferences,
    sendNotification,
    sendTransactionAlert,
    sendLowBalanceAlert,
    sendSecurityAlert,
    sendSystemUpdate,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  }
}
