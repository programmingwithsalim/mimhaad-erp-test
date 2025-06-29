import { sql } from "@/lib/db"

export interface NotificationConfig {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  login_alerts: boolean
  transaction_alerts: boolean
  low_balance_alerts: boolean
  high_value_transaction_threshold: number
  low_balance_threshold: number
  email_address?: string
  phone_number?: string
}

export interface NotificationData {
  type: "login" | "transaction" | "low_balance" | "high_value_transaction" | "system_alert"
  title: string
  message: string
  userId: string
  branchId?: string
  metadata?: Record<string, any>
  priority: "low" | "medium" | "high" | "critical"
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
    try {
      console.log("🔔 Sending notification:", data)

      // Get user notification preferences
      const userPrefs = await this.getUserNotificationSettings(data.userId)

      if (!userPrefs) {
        console.log("⚠️ No notification preferences found for user:", data.userId)
        return { success: false, error: "User preferences not found" }
      }

      // Check if this type of notification is enabled
      const shouldSend = this.shouldSendNotification(data.type, userPrefs)

      if (!shouldSend) {
        console.log("⚠️ Notification type disabled for user:", data.type)
        return { success: true, message: "Notification disabled by user preferences" }
      }

      // Store notification in database
      await sql`
        INSERT INTO notifications (
          id, user_id, branch_id, type, title, message, 
          metadata, priority, status, created_at
        ) VALUES (
          gen_random_uuid(),
          ${data.userId},
          ${data.branchId || null},
          ${data.type},
          ${data.title},
          ${data.message},
          ${JSON.stringify(data.metadata || {})},
          ${data.priority},
          'sent',
          CURRENT_TIMESTAMP
        )
      `

      // Send via enabled channels
      const results = []

      if (userPrefs.email_enabled && userPrefs.email_address) {
        const emailResult = await this.sendEmailNotification(data, userPrefs)
        results.push({ channel: "email", ...emailResult })
      }

      if (userPrefs.sms_enabled && userPrefs.phone_number) {
        const smsResult = await this.sendSMSNotification(data, userPrefs)
        results.push({ channel: "sms", ...smsResult })
      }

      if (userPrefs.push_enabled) {
        const pushResult = await this.sendPushNotification(data, userPrefs)
        results.push({ channel: "push", ...pushResult })
      }

      console.log("✅ Notification sent successfully")
      return { success: true, results }
    } catch (error) {
      console.error("❌ Error sending notification:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  static async sendLoginAlert(
    userId: string,
    loginData: {
      ipAddress: string
      userAgent: string
      location?: string
      branchId?: string
    },
  ) {
    const user = await sql`
      SELECT first_name || ' ' || last_name as full_name, email, phone FROM users WHERE id = ${userId}
    `

    if (user.length === 0) return { success: false, error: "User not found" }

    const userData = user[0]
    const timestamp = new Date().toLocaleString()

    return this.sendNotification({
      type: "login",
      title: "New Login Alert",
      message: `Hello ${userData.full_name}, a new login was detected on your account at ${timestamp}. IP: ${loginData.ipAddress}. If this wasn't you, please contact support immediately.`,
      userId,
      branchId: loginData.branchId,
      metadata: {
        ip_address: loginData.ipAddress,
        user_agent: loginData.userAgent,
        location: loginData.location,
        timestamp,
      },
      priority: "medium",
    })
  }

  static async sendTransactionAlert(
    userId: string,
    transactionData: {
      type: string
      amount: number
      service: string
      reference: string
      branchId?: string
    },
  ) {
    const user = await sql`
      SELECT first_name || ' ' || last_name as full_name, email, phone FROM users WHERE id = ${userId}
    `

    if (user.length === 0) return { success: false, error: "User not found" }

    const userData = user[0]
    const timestamp = new Date().toLocaleString()

    return this.sendNotification({
      type: "transaction",
      title: "Transaction Alert",
      message: `Transaction processed: ${transactionData.service} ${transactionData.type} of GHS ${transactionData.amount.toFixed(2)}. Reference: ${transactionData.reference}`,
      userId,
      branchId: transactionData.branchId,
      metadata: {
        ...transactionData,
        timestamp,
      },
      priority: transactionData.amount > 1000 ? "high" : "medium",
    })
  }

  static async sendLowBalanceAlert(
    userId: string,
    floatData: {
      accountName: string
      currentBalance: number
      threshold: number
      branchId?: string
    },
  ) {
    return this.sendNotification({
      type: "low_balance",
      title: "Low Balance Alert",
      message: `Float account "${floatData.accountName}" has a low balance of GHS ${floatData.currentBalance.toFixed(2)}, which is below the threshold of GHS ${floatData.threshold.toFixed(2)}. Please recharge soon.`,
      userId,
      branchId: floatData.branchId,
      metadata: floatData,
      priority: "high",
    })
  }

  private static async getUserNotificationSettings(userId: string): Promise<NotificationConfig | null> {
    try {
      const settings = await sql`
        SELECT 
          email_notifications as email_enabled,
          email_address,
          sms_notifications as sms_enabled,
          phone_number,
          push_notifications as push_enabled,
          login_alerts,
          transaction_alerts,
          float_threshold_alerts as low_balance_alerts,
          COALESCE(alert_frequency, 'immediate') as alert_frequency,
          1000 as high_value_transaction_threshold,
          100 as low_balance_threshold
        FROM user_notification_settings 
        WHERE user_id = ${userId}
      `

      if (settings.length === 0) {
        // Get user's email and phone from users table as fallback
        const user = await sql`
          SELECT email, phone FROM users WHERE id = ${userId}
        `

        if (user.length === 0) return null

        // Return default settings with user's contact info
        return {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          login_alerts: true,
          transaction_alerts: true,
          low_balance_alerts: true,
          high_value_transaction_threshold: 1000,
          low_balance_threshold: 100,
          email_address: user[0].email,
          phone_number: user[0].phone,
        }
      }

      const setting = settings[0]
      return {
        email_enabled: setting.email_enabled || false,
        sms_enabled: setting.sms_enabled || false,
        push_enabled: setting.push_enabled || false,
        login_alerts: setting.login_alerts || false,
        transaction_alerts: setting.transaction_alerts || false,
        low_balance_alerts: setting.low_balance_alerts || false,
        high_value_transaction_threshold: setting.high_value_transaction_threshold || 1000,
        low_balance_threshold: setting.low_balance_threshold || 100,
        email_address: setting.email_address,
        phone_number: setting.phone_number,
      }
    } catch (error) {
      console.error("Error fetching user notification settings:", error)
      return null
    }
  }

  private static shouldSendNotification(type: string, prefs: NotificationConfig): boolean {
    switch (type) {
      case "login":
        return prefs.login_alerts
      case "transaction":
        return prefs.transaction_alerts
      case "low_balance":
        return prefs.low_balance_alerts
      default:
        return true // Send system alerts by default
    }
  }

  private static async sendEmailNotification(data: NotificationData, prefs: NotificationConfig) {
    try {
      if (!prefs.email_address) {
        return { success: false, error: "No email address configured" }
      }

      // In a real implementation, you would integrate with an email service like:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - Resend

      console.log("📧 Sending email notification to:", prefs.email_address)
      console.log("Subject:", data.title)
      console.log("Message:", data.message)

      // Simulate email sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100))

      // For testing purposes, we'll log the email content
      console.log(`
        ===== EMAIL NOTIFICATION =====
        To: ${prefs.email_address}
        Subject: ${data.title}
        
        ${data.message}
        
        Priority: ${data.priority}
        Type: ${data.type}
        Timestamp: ${new Date().toISOString()}
        ==============================
      `)

      return { success: true, message: "Email notification sent successfully" }
    } catch (error) {
      console.error("Email notification error:", error)
      return { success: false, error: error instanceof Error ? error.message : "Email send failed" }
    }
  }

  private static async sendSMSNotification(data: NotificationData, prefs: NotificationConfig) {
    try {
      if (!prefs.phone_number) {
        return { success: false, error: "No phone number configured" }
      }

      // In a real implementation, you would integrate with an SMS service like:
      // - Twilio
      // - AWS SNS
      // - Africa's Talking
      // - Hubtel (for Ghana)

      console.log("📱 Sending SMS notification to:", prefs.phone_number)
      console.log("Message:", data.message)

      // Simulate SMS sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100))

      // For testing purposes, we'll log the SMS content
      console.log(`
        ===== SMS NOTIFICATION =====
        To: ${prefs.phone_number}
        Message: ${data.message}
        
        Priority: ${data.priority}
        Type: ${data.type}
        Timestamp: ${new Date().toISOString()}
        ============================
      `)

      return { success: true, message: "SMS notification sent successfully" }
    } catch (error) {
      console.error("SMS notification error:", error)
      return { success: false, error: error instanceof Error ? error.message : "SMS send failed" }
    }
  }

  private static async sendPushNotification(data: NotificationData, prefs: NotificationConfig) {
    try {
      // In a real implementation, you would integrate with a push notification service like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      // - Pusher

      console.log("🔔 Sending push notification")
      console.log("Title:", data.title)
      console.log("Message:", data.message)

      // Simulate push notification sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100))

      // For testing purposes, we'll log the push notification content
      console.log(`
        ===== PUSH NOTIFICATION =====
        Title: ${data.title}
        Message: ${data.message}
        
        Priority: ${data.priority}
        Type: ${data.type}
        Timestamp: ${new Date().toISOString()}
        =============================
      `)

      return { success: true, message: "Push notification sent successfully" }
    } catch (error) {
      console.error("Push notification error:", error)
      return { success: false, error: error instanceof Error ? error.message : "Push send failed" }
    }
  }

  static async getNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      type?: string
      status?: string
    } = {},
  ) {
    try {
      const { limit = 50, offset = 0, type, status } = options

      const notifications = await sql`
        SELECT 
          id, type, title, message, metadata, priority, 
          status, created_at, read_at
        FROM notifications 
        WHERE user_id = ${userId}
        ${type ? sql`AND type = ${type}` : sql``}
        ${status ? sql`AND status = ${status}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      return {
        success: true,
        notifications: notifications.map((n) => ({
          ...n,
          metadata: typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata,
        })),
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      await sql`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP, status = 'read'
        WHERE id = ${notificationId} AND user_id = ${userId}
      `

      return { success: true }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  // Test method to send a sample notification
  static async sendTestNotification(userId: string) {
    return this.sendNotification({
      type: "system_alert",
      title: "Test Notification",
      message: "This is a test notification to verify your notification settings are working correctly.",
      userId,
      priority: "low",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
