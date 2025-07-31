import { sql } from "@/lib/db"
import { formatGhanaPhoneNumber, formatPhoneForSMS } from "@/lib/utils/phone-utils"
import { logger, LogCategory } from "@/lib/logger"

export interface CustomerNotificationData {
  type: "transaction_success" | "transaction_failed" | "balance_update" | "service_alert"
  title: string
  message: string
  customerPhone: string
  customerName?: string
  transactionId?: string
  amount?: number
  service?: string
  reference?: string
  metadata?: Record<string, any>
}

export class CustomerNotificationService {
  // List of known test/hardcoded phone numbers to avoid sending SMS to
  private static readonly TEST_PHONE_NUMBERS = [
    "0549514616",
    "549514616", 
    "+233549514616",
    "233549514616",
    "0549514617",
    "549514617",
    "+233549514617",
    "233549514617"
  ]

  /**
   * Check if a phone number is a test/hardcoded number
   */
  private static isTestPhoneNumber(phone: string): boolean {
    if (!phone) return false
    
    const cleaned = phone.replace(/[\s\-\(\)]/g, "")
    return this.TEST_PHONE_NUMBERS.includes(cleaned)
  }

  /**
   * Send mandatory notification to customer (not dependent on user preferences)
   */
  static async sendCustomerNotification(data: CustomerNotificationData) {
    try {
      await logger.info(LogCategory.TRANSACTION, "Sending customer notification", {
        type: data.type,
        customerPhone: data.customerPhone,
        transactionId: data.transactionId,
        amount: data.amount,
      })

      // Check if this is a test phone number
      if (this.isTestPhoneNumber(data.customerPhone)) {
        await logger.warn(LogCategory.TRANSACTION, "Skipping SMS to test phone number", {
          customerPhone: data.customerPhone,
          transactionId: data.transactionId,
        })
        console.log("⚠️ Skipping SMS to test phone number:", data.customerPhone)
        return { 
          success: false, 
          error: "Cannot send SMS to test phone number",
          skipped: true 
        }
      }

      // Format phone number for Ghana
      const formattedPhone = formatGhanaPhoneNumber(data.customerPhone)
      const smsPhone = formatPhoneForSMS(data.customerPhone)

      console.log("📱 Customer notification details:", {
        originalPhone: data.customerPhone,
        formattedPhone,
        smsPhone,
        customerName: data.customerName,
        message: data.message,
        isTestNumber: this.isTestPhoneNumber(data.customerPhone),
      })

      // Get system SMS configuration
      const smsConfig = await this.getSystemSMSConfig()
      
      console.log("📧 SMS Configuration:", smsConfig)
      
      if (!smsConfig) {
        await logger.warn(LogCategory.TRANSACTION, "No SMS configuration found, skipping customer notification")
        console.log("❌ No SMS configuration found in system_settings")
        return { success: false, error: "No SMS configuration found" }
      }

      // Send SMS notification
      const smsResult = await this.sendSMSNotification(data, smsPhone, smsConfig)
      
      console.log("📤 SMS Result:", smsResult)
      
      // Log the notification attempt
      await this.logCustomerNotification(data, smsResult.success)

      return smsResult
    } catch (error) {
      await logger.error(LogCategory.TRANSACTION, "Customer notification failed", error as Error, {
        customerPhone: data.customerPhone,
        type: data.type,
      })
      console.error("❌ Customer notification error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Customer notification failed",
      }
    }
  }

  /**
   * Send transaction success notification to customer
   */
  static async sendTransactionSuccessNotification(
    customerPhone: string,
    customerName: string,
    transactionData: {
      amount: number
      service: string
      reference: string
      transactionId: string
    }
  ) {
    const message = `Dear ${customerName}, your ${transactionData.service} transaction of GHS ${transactionData.amount.toFixed(2)} has been processed successfully. Reference: ${transactionData.reference}. Thank you for using our service.`

    return this.sendCustomerNotification({
      type: "transaction_success",
      title: "Transaction Successful",
      message,
      customerPhone,
      customerName,
      transactionId: transactionData.transactionId,
      amount: transactionData.amount,
      service: transactionData.service,
      reference: transactionData.reference,
      metadata: transactionData,
    })
  }

  /**
   * Send transaction failed notification to customer
   */
  static async sendTransactionFailedNotification(
    customerPhone: string,
    customerName: string,
    transactionData: {
      amount: number
      service: string
      reference: string
      transactionId: string
      reason?: string
    }
  ) {
    const reason = transactionData.reason || "technical issue"
    const message = `Dear ${customerName}, your ${transactionData.service} transaction of GHS ${transactionData.amount.toFixed(2)} could not be processed due to ${reason}. Reference: ${transactionData.reference}. Please try again or contact support.`

    return this.sendCustomerNotification({
      type: "transaction_failed",
      title: "Transaction Failed",
      message,
      customerPhone,
      customerName,
      transactionId: transactionData.transactionId,
      amount: transactionData.amount,
      service: transactionData.service,
      reference: transactionData.reference,
      metadata: { ...transactionData, reason },
    })
  }

  /**
   * Get system SMS configuration
   */
  private static async getSystemSMSConfig() {
    try {
      console.log("🔍 Fetching SMS configuration from system_config...")
      
      const config = await sql`
        SELECT 
          config_key, config_value
        FROM system_config 
        WHERE config_key IN ('sms_provider', 'sms_api_key', 'sms_api_secret', 'sms_sender_id')
      `

      console.log("📋 Raw SMS config from database:", config)

      if (config.length === 0) {
        console.log("❌ No SMS settings found in system_config table")
        return null
      }

      // Convert to object
      const configObj = config.reduce((acc: any, setting: any) => {
        acc[setting.config_key] = setting.config_value
        return acc
      }, {})

      console.log("🔧 Processed SMS config object:", configObj)

      const result = {
        provider: configObj.sms_provider || "hubtel",
        apiKey: configObj.sms_api_key,
        apiSecret: configObj.sms_api_secret,
        senderId: configObj.sms_sender_id,
      }

      console.log("✅ Final SMS config:", result)
      return result
    } catch (error) {
      console.error("❌ Error getting system SMS config:", error)
      return null
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMSNotification(
    data: CustomerNotificationData,
    phone: string,
    config: any
  ) {
    try {
      const { provider, apiKey, apiSecret, senderId } = config

      if (!apiKey || !senderId || !phone) {
        return { success: false, error: "Missing SMS configuration" }
      }

      if (provider === "smsonlinegh") {
        // SMSOnlineGH API
        const response = await fetch(
          "https://api.smsonlinegh.com/v4/message/sms/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              sender: senderId,
              message: data.message,
              recipients: [phone],
            }),
          }
        )
        const result = await response.json()
        if (result.status === "success" || result.status === true) {
          return { success: true, message: "SMS sent via SMSOnlineGH" }
        } else {
          return {
            success: false,
            error: result.message || "SMSOnlineGH send failed",
          }
        }
      } else if (provider === "hubtel") {
        // Hubtel API - use HTTP Basic Auth
        const url = "https://devp-sms03726-api.hubtel.com/v1/messages/send"
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            from: senderId,
            to: phone,
            content: data.message,
          }),
        })
        const result = await response.json()

        // Hubtel returns status: 0 for success, or other values for failure
        if (result.status === 0 || (result.data && result.data.status === 0)) {
          return { success: true, message: "SMS sent via Hubtel" }
        } else {
          return {
            success: false,
            error:
              result.statusDescription ||
              result.message ||
              `Hubtel send failed with status: ${result.status}`,
          }
        }
      }

      // Simulate SMS sending for testing
      await new Promise((resolve) => setTimeout(resolve, 100))
      console.log(
        `\n===== CUSTOMER SMS NOTIFICATION =====\nTo: ${phone}\nMessage: ${data.message}\nType: ${data.type}\nTimestamp: ${new Date().toISOString()}\n============================\n`
      )
      return {
        success: true,
        message: "Customer SMS notification sent successfully (simulated)",
      }
    } catch (error) {
      console.error("Customer SMS notification error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS send failed",
      }
    }
  }

  /**
   * Log customer notification attempt
   */
  private static async logCustomerNotification(
    data: CustomerNotificationData,
    success: boolean
  ) {
    try {
      await sql`
        INSERT INTO system_logs (
          level,
          category,
          message,
          details,
          entity_id,
          entity_type,
          metadata
        ) VALUES (
          ${success ? 'INFO' : 'ERROR'},
          'CUSTOMER_NOTIFICATION',
          ${`Customer notification ${success ? 'sent' : 'failed'}: ${data.type}`},
          ${JSON.stringify(data)},
          ${data.transactionId || null},
          'customer_notification',
          ${JSON.stringify({
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            type: data.type,
            success,
          })}
        )
      `
    } catch (error) {
      console.error("Error logging customer notification:", error)
    }
  }
}