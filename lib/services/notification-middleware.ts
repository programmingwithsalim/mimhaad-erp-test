"use client"

import { useNotifications } from "@/hooks/use-notifications"
import { useAuth } from "@/lib/auth-context"

interface TransactionNotification {
  type: string
  operation: string
  amount: number
  customerPhone?: string
  customerName?: string
  reference: string
  status: string
}

// Notification middleware for automatic notifications
export class NotificationMiddleware {
  private static instance: NotificationMiddleware
  private notificationService: any
  private currentUser: any

  constructor() {
    // This will be initialized when used in components
  }

  static getInstance(): NotificationMiddleware {
    if (!NotificationMiddleware.instance) {
      NotificationMiddleware.instance = new NotificationMiddleware()
    }
    return NotificationMiddleware.instance
  }

  initialize(notificationService: any, user: any) {
    this.notificationService = notificationService
    this.currentUser = user
  }

  // Transaction notifications
  async notifyTransaction(data: TransactionNotification): Promise<void> {
    try {
      // Log the transaction notification
      console.log(`[NOTIFICATION] ${data.type} ${data.operation} - ${data.amount} GHS - ${data.status}`)

      // Here you would integrate with your notification service
      // For now, we'll just log it
      const message = `${data.type} ${data.operation} of ${data.amount} GHS ${data.status} for ${data.customerName || data.customerPhone}`

      // You can integrate with SMS, email, or push notification services here
      if (data.customerPhone) {
        await this.sendSMS(data.customerPhone, message)
      }
      if (data.customerName) {
        await this.sendEmail(this.currentUser.email, message)
      }

      console.log(`Notification sent: ${message}`)
    } catch (error) {
      console.error("Failed to send notification:", error)
      // Don't throw error to avoid breaking the main transaction flow
    }
  }

  // Login/Authentication notifications
  async notifyLogin(loginData: {
    userId: string
    email: string
    ipAddress?: string
    userAgent?: string
    loginTime: string
  }) {
    if (!this.notificationService) return

    try {
      await this.notificationService.sendNotification({
        type: "security",
        title: "New Login Detected",
        message: `Login detected at ${loginData.loginTime}${loginData.ipAddress ? ` from ${loginData.ipAddress}` : ""}`,
        userId: loginData.userId,
        email: loginData.email,
      })

      console.log(`✅ Login notification sent for user ${loginData.email}`)
    } catch (error) {
      console.error("Failed to send login notification:", error)
    }
  }

  // System change notifications
  async notifySystemChange(changeData: {
    type: "user_created" | "user_updated" | "role_changed" | "branch_created" | "float_allocated" | "expense_approved"
    description: string
    affectedUserId?: string
    affectedUserEmail?: string
    performedBy: string
    details?: any
  }) {
    if (!this.notificationService) return

    try {
      const { type, description, affectedUserId, affectedUserEmail, performedBy, details } = changeData

      // Send to affected user if specified
      if (affectedUserId || affectedUserEmail) {
        await this.notificationService.sendNotification({
          type: "system",
          title: "Account Update",
          message: description,
          userId: affectedUserId,
          email: affectedUserEmail,
        })
      }

      // Send to admins/managers for important changes
      if (["user_created", "role_changed", "float_allocated"].includes(type)) {
        // This would typically query for admin users, but for now we'll use current user
        await this.notificationService.sendNotification({
          type: "system",
          title: "System Change Alert",
          message: `${description} by ${performedBy}`,
          userId: this.currentUser.id,
          email: this.currentUser.email,
        })
      }

      console.log(`✅ System change notification sent for ${type}`)
    } catch (error) {
      console.error("Failed to send system change notification:", error)
    }
  }

  // Float balance alerts
  async notifyLowBalance(balanceData: {
    accountName: string
    currentBalance: number
    threshold: number
    branchId: string
  }) {
    if (!this.notificationService || !this.currentUser) return

    try {
      await this.notificationService.sendNotification({
        type: "system",
        title: "Low Balance Alert",
        message: `${balanceData.accountName} balance (GHS ${balanceData.currentBalance}) is below threshold (GHS ${balanceData.threshold})`,
        userId: this.currentUser.id,
        email: this.currentUser.email,
      })

      console.log(`✅ Low balance notification sent for ${balanceData.accountName}`)
    } catch (error) {
      console.error("Failed to send low balance notification:", error)
    }
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // Implement SMS sending logic here
    console.log(`SMS to ${phone}: ${message}`)
  }

  private async sendEmail(email: string, message: string): Promise<void> {
    // Implement email sending logic here
    console.log(`Email to ${email}: ${message}`)
  }
}

// Hook to use notification middleware in components
export function useNotificationMiddleware() {
  const notificationService = useNotifications()
  const { user } = useAuth()
  const middleware = NotificationMiddleware.getInstance()

  // Initialize middleware with current services
  if (user && notificationService) {
    middleware.initialize(notificationService, user)
  }

  return middleware
}
