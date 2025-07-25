import { sql } from "@/lib/db";
import { EmailTemplates } from "@/lib/email-templates";

export interface NotificationConfig {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  login_alerts: boolean;
  transaction_alerts: boolean;
  low_balance_alerts: boolean;
  high_value_transaction_threshold: number;
  low_balance_threshold: number;
  email_address?: string;
  phone_number?: string;
  sms_provider?: string; // Added for SMSOnlineGH
  sms_api_key?: string; // Added for SMSOnlineGH
  sms_api_secret?: string; // Added for Hubtel
  sms_sender_id?: string; // Added for Hubtel
}

export interface NotificationData {
  type:
    | "login"
    | "transaction"
    | "low_balance"
    | "high_value_transaction"
    | "system_alert";
  title: string;
  message: string;
  userId: string;
  branchId?: string;
  metadata?: Record<string, any>;
  priority: "low" | "medium" | "high" | "critical";
}

export class NotificationService {
  static async sendNotification(data: NotificationData) {
    try {
      console.log("🔔 Sending notification:", data);

      // Get user notification preferences
      const userPrefs = await this.getUserNotificationSettings(data.userId);

      if (!userPrefs) {
        console.log(
          "⚠️ No notification preferences found for user:",
          data.userId
        );
        return { success: false, error: "User preferences not found" };
      }

      // Check if this type of notification is enabled
      const shouldSend = this.shouldSendNotification(data.type, userPrefs);

      if (!shouldSend) {
        console.log("⚠️ Notification type disabled for user:", data.type);
        return {
          success: true,
          message: "Notification disabled by user preferences",
        };
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
      `;

      // Send via enabled channels
      const results = [];

      if (userPrefs.email_enabled && userPrefs.email_address) {
        const emailResult = await this.sendEmailNotification(data, userPrefs);
        results.push({ channel: "email", ...emailResult });
      }

      if (userPrefs.sms_enabled && userPrefs.phone_number) {
        const smsResult = await this.sendSMSNotification(data, userPrefs);
        results.push({ channel: "sms", ...smsResult });
      }

      if (userPrefs.push_enabled) {
        const pushResult = await this.sendPushNotification(data, userPrefs);
        results.push({ channel: "push", ...pushResult });
      }

      console.log("✅ Notification sent successfully");
      return { success: true, results };
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async sendLoginAlert(
    userId: string,
    loginData: {
      ipAddress: string;
      userAgent: string;
      location?: string;
      branchId?: string;
    }
  ) {
    const user = await sql`
      SELECT first_name || ' ' || last_name as full_name, email, phone FROM users WHERE id = ${userId}
    `;

    if (user.length === 0) return { success: false, error: "User not found" };

    const userData = user[0];
    const timestamp = new Date().toLocaleString();

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
    });
  }

  static async sendTransactionAlert(
    userId: string,
    transactionData: {
      type: string;
      amount: number;
      service: string;
      reference: string;
      branchId?: string;
    }
  ) {
    const user = await sql`
      SELECT first_name || ' ' || last_name as full_name, email, phone FROM users WHERE id = ${userId}
    `;

    if (user.length === 0) return { success: false, error: "User not found" };

    const userData = user[0];
    const timestamp = new Date().toLocaleString();

    return this.sendNotification({
      type: "transaction",
      title: "Transaction Alert",
      message: `Transaction processed: ${transactionData.service} ${
        transactionData.type
      } of GHS ${transactionData.amount.toFixed(2)}. Reference: ${
        transactionData.reference
      }`,
      userId,
      branchId: transactionData.branchId,
      metadata: {
        ...transactionData,
        timestamp,
      },
      priority: transactionData.amount > 1000 ? "high" : "medium",
    });
  }

  static async sendLowBalanceAlert(
    userId: string,
    floatData: {
      accountName: string;
      currentBalance: number;
      threshold: number;
      branchId?: string;
    }
  ) {
    return this.sendNotification({
      type: "low_balance",
      title: "Low Balance Alert",
      message: `Float account "${
        floatData.accountName
      }" has a low balance of GHS ${floatData.currentBalance.toFixed(
        2
      )}, which is below the threshold of GHS ${floatData.threshold.toFixed(
        2
      )}. Please recharge soon.`,
      userId,
      branchId: floatData.branchId,
      metadata: floatData,
      priority: "high",
    });
  }

  private static async getUserNotificationSettings(
    userId: string
  ): Promise<NotificationConfig | null> {
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
          100 as low_balance_threshold,
          sms_provider,
          sms_api_key,
          sms_api_secret,
          sms_sender_id
        FROM user_notification_settings 
        WHERE user_id = ${userId}
      `;

      // Get system SMS configuration
      const systemConfig = await sql`
        SELECT config_key, config_value
        FROM system_config
        WHERE config_key IN (
          'sms_provider',
          'hubtel_sms_api_key',
          'hubtel_sms_api_secret', 
          'hubtel_sms_sender_id',
          'smsonlinegh_sms_api_key',
          'smsonlinegh_sms_api_secret',
          'smsonlinegh_sms_sender_id'
        )
      `;

      // Convert system config to object
      const systemConfigObj = systemConfig.reduce((acc: any, config: any) => {
        acc[config.config_key] = config.config_value;
        return acc;
      }, {});

      if (settings.length === 0) {
        // Get user's email and phone from users table as fallback
        const user = await sql`
          SELECT email, phone FROM users WHERE id = ${userId}
        `;

        if (user.length === 0) return null;

        // Return default settings with user's contact info and system SMS config
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
          sms_provider: systemConfigObj.sms_provider || "hubtel",
          sms_api_key:
            systemConfigObj.hubtel_sms_api_key ||
            systemConfigObj.smsonlinegh_sms_api_key,
          sms_api_secret:
            systemConfigObj.hubtel_sms_api_secret ||
            systemConfigObj.smsonlinegh_sms_api_secret,
          sms_sender_id:
            systemConfigObj.hubtel_sms_sender_id ||
            systemConfigObj.smsonlinegh_sms_sender_id,
        };
      }

      const setting = settings[0];
      return {
        email_enabled: setting.email_enabled || false,
        sms_enabled: setting.sms_enabled || false,
        push_enabled: setting.push_enabled || false,
        login_alerts: setting.login_alerts || false,
        transaction_alerts: setting.transaction_alerts || false,
        low_balance_alerts: setting.low_balance_alerts || false,
        high_value_transaction_threshold:
          setting.high_value_transaction_threshold || 1000,
        low_balance_threshold: setting.low_balance_threshold || 100,
        email_address: setting.email_address,
        phone_number: setting.phone_number,
        sms_provider:
          setting.sms_provider || systemConfigObj.sms_provider || "hubtel",
        sms_api_key:
          setting.sms_api_key ||
          systemConfigObj.hubtel_sms_api_key ||
          systemConfigObj.smsonlinegh_sms_api_key,
        sms_api_secret:
          setting.sms_api_secret ||
          systemConfigObj.hubtel_sms_api_secret ||
          systemConfigObj.smsonlinegh_sms_api_secret,
        sms_sender_id:
          setting.sms_sender_id ||
          systemConfigObj.hubtel_sms_sender_id ||
          systemConfigObj.smsonlinegh_sms_sender_id,
      };
    } catch (error) {
      console.error("Error fetching user notification settings:", error);
      return null;
    }
  }

  private static shouldSendNotification(
    type: string,
    prefs: NotificationConfig
  ): boolean {
    switch (type) {
      case "login":
        return prefs.login_alerts;
      case "transaction":
        return prefs.transaction_alerts;
      case "low_balance":
        return prefs.low_balance_alerts;
      default:
        return true; // Send system alerts by default
    }
  }

  private static async sendEmailNotification(
    data: NotificationData,
    prefs: NotificationConfig
  ) {
    try {
      if (!prefs.email_address) {
        return { success: false, error: "No email address configured" };
      }

      // Use the real EmailService
      const { EmailService } = await import("@/lib/email-service");
      let template;
      let templateData;
      if (data.type === "transaction") {
        template = "transactionAlert";
        templateData = {
          userName: prefs.email_address,
          transactionDetails: {
            id: data.metadata?.reference || "N/A",
            amount: data.metadata?.amount || 0,
            type: data.metadata?.type || "transaction",
            date: data.metadata?.timestamp || new Date().toISOString(),
            service: data.metadata?.service || "Unknown",
            message: data.message,
          },
        };
      } else if (data.type === "login") {
        template = "loginAlert";
        templateData = {
          userName: prefs.email_address,
          loginData: {
            ipAddress: data.metadata?.ip_address || "Unknown",
            userAgent: data.metadata?.user_agent || "Unknown",
            location: data.metadata?.location || "Unknown",
            timestamp: data.metadata?.timestamp || new Date().toISOString(),
          },
        };
      } else if (data.type === "low_balance") {
        template = "lowBalanceAlert";
        templateData = {
          userName: prefs.email_address,
          accountType: data.metadata?.accountName || "Float",
          currentBalance: data.metadata?.currentBalance || 0,
          threshold: data.metadata?.threshold || 0,
        };
      } else {
        template = "welcome";
        templateData = { userName: prefs.email_address, ...data.metadata };
      }
      const sent = await EmailService.sendEmail(
        prefs.email_address,
        template,
        templateData
      );
      if (sent) {
        return {
          success: true,
          message: "Email notification sent successfully",
        };
      } else {
        return { success: false, error: "Failed to send email via provider" };
      }
    } catch (error) {
      console.error("Email notification error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Email send failed",
      };
    }
  }

  private static async sendSMSNotification(
    data: NotificationData,
    prefs: NotificationConfig
  ) {
    try {
      if (!prefs.phone_number) {
        return { success: false, error: "No phone number configured" };
      }

      // Determine provider
      const provider = prefs.sms_provider || "hubtel";
      const apiKey = prefs.sms_api_key;
      const apiSecret = prefs.sms_api_secret;
      const senderId = prefs.sms_sender_id;
      const phone = prefs.phone_number;
      const message = data.message;

      console.log("🔍 [SMS] Configuration:", {
        provider,
        apiKey: apiKey ? "***" : "missing",
        apiSecret: apiSecret ? "***" : "missing",
        senderId,
        phone,
        messageLength: message.length,
      });

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
              message,
              recipients: [phone],
            }),
          }
        );
        const result = await response.json();
        if (result.status === "success" || result.status === true) {
          return { success: true, message: "SMS sent via SMSOnlineGH" };
        } else {
          return {
            success: false,
            error: result.message || "SMSOnlineGH send failed",
          };
        }
      } else if (provider === "hubtel") {
        // Hubtel API - use HTTP Basic Auth
        const formattedPhone = phone.startsWith("+")
          ? phone.substring(1)
          : phone.startsWith("233")
          ? phone
          : `233${phone.replace(/^0/, "")}`;

        const url = "https://devp-sms03726-api.hubtel.com/v1/messages/send";
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            from: senderId,
            to: formattedPhone,
            content: message,
          }),
        });
        const result = await response.json();
        console.log("🔍 [HUBTEL] API Response:", result);

        // Hubtel returns status: 0 for success, or other values for failure
        if (result.status === 0 || (result.data && result.data.status === 0)) {
          return { success: true, message: "SMS sent via Hubtel" };
        } else {
          return {
            success: false,
            error:
              result.statusDescription ||
              result.message ||
              `Hubtel send failed with status: ${result.status}`,
          };
        }
      }

      // Simulate SMS sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(
        `\n===== SMS NOTIFICATION =====\nTo: ${phone}\nMessage: ${message}\nPriority: ${
          data.priority
        }\nType: ${
          data.type
        }\nTimestamp: ${new Date().toISOString()}\n============================\n`
      );
      return {
        success: true,
        message: "SMS notification sent successfully (simulated)",
      };
    } catch (error) {
      console.error("SMS notification error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS send failed",
      };
    }
  }

  private static async sendPushNotification(
    data: NotificationData,
    prefs: NotificationConfig
  ) {
    try {
      // In a real implementation, you would integrate with a push notification service like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      // - Pusher

      console.log("🔔 Sending push notification");
      console.log("Title:", data.title);
      console.log("Message:", data.message);

      // Simulate push notification sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For testing purposes, we'll log the push notification content
      console.log(`
        ===== PUSH NOTIFICATION =====
        Title: ${data.title}
        Message: ${data.message}
        
        Priority: ${data.priority}
        Type: ${data.type}
        Timestamp: ${new Date().toISOString()}
        =============================
      `);

      return { success: true, message: "Push notification sent successfully" };
    } catch (error) {
      console.error("Push notification error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Push send failed",
      };
    }
  }

  // Send only an SMS for testing purposes
  static async sendSMSNotificationOnly(
    userId: string,
    config: any,
    testPhone: string
  ) {
    try {
      // Compose a test message
      const message =
        "This is a test SMS notification to verify your SMS settings are working correctly.";
      const provider = config.smsProvider || config.sms_provider || "hubtel";
      const apiKey = config.smsApiKey || config.sms_api_key;
      const apiSecret = config.smsApiSecret || config.sms_api_secret;
      const senderId = config.smsSenderId || config.sms_sender_id;
      const phone = testPhone;

      if (!apiKey || !senderId || !phone) {
        return { success: false, error: "Missing SMS config or phone number" };
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
              message,
              recipients: [phone],
            }),
          }
        );
        const result = await response.json();
        if (result.status === "success" || result.status === true) {
          return { success: true, message: "SMS sent via SMSOnlineGH" };
        } else {
          return {
            success: false,
            error: result.message || "SMSOnlineGH send failed",
          };
        }
      } else if (provider === "hubtel") {
        // Hubtel API - use HTTP Basic Auth
        const formattedPhone = phone.startsWith("+")
          ? phone.substring(1)
          : phone.startsWith("233")
          ? phone
          : `233${phone.replace(/^0/, "")}`;

        const url = "https://devp-sms03726-api.hubtel.com/v1/messages/send";
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            from: senderId,
            to: formattedPhone,
            content: message,
          }),
        });
        const result = await response.json();
        console.log("🔍 [HUBTEL] API Response:", result);

        if (result.status === 0 || (result.data && result.data.status === 0)) {
          return { success: true, message: "SMS sent via Hubtel" };
        } else {
          return {
            success: false,
            error:
              result.statusDescription ||
              result.message ||
              `Hubtel send failed with status: ${result.status}`,
          };
        }
      }

      // Simulate SMS sending with a delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(
        `\n===== TEST SMS NOTIFICATION =====\nTo: ${phone}\nMessage: ${message}\nProvider: ${provider}\nTimestamp: ${new Date().toISOString()}\n============================\n`
      );
      return {
        success: true,
        message: "SMS notification sent successfully (simulated)",
      };
    } catch (error) {
      console.error("SMS notification error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS send failed",
      };
    }
  }

  static async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      status?: string;
    } = {}
  ) {
    try {
      const { limit = 50, offset = 0, type, status } = options;

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
      `;

      return {
        success: true,
        notifications: notifications.map((n) => ({
          ...n,
          metadata:
            typeof n.metadata === "string"
              ? JSON.parse(n.metadata)
              : n.metadata,
        })),
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      await sql`
        UPDATE notifications 
        SET read_at = CURRENT_TIMESTAMP, status = 'read'
        WHERE id = ${notificationId} AND user_id = ${userId}
      `;

      return { success: true };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Test method to send a sample notification
  static async sendTestNotification(userId: string) {
    return this.sendNotification({
      type: "system_alert",
      title: "Test Notification",
      message:
        "This is a test notification to verify your notification settings are working correctly.",
      userId,
      priority: "low",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
