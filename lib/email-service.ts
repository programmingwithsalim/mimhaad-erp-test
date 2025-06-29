type EmailTemplate = "password_reset" | "welcome" | "account_locked" | "verification"

/**
 * Mock email service
 * In a real application, this would connect to an actual email provider
 */
export class EmailService {
  /**
   * Send an email notification
   * @param to Recipient email address
   * @param template Email template to use
   * @param data Data to populate the template
   * @returns Promise that resolves when the email is "sent"
   */
  static async sendEmail(to: string, template: EmailTemplate, data: Record<string, any>): Promise<boolean> {
    // In a real app, this would connect to an email service
    console.log(`Sending ${template} email to ${to}`, data)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return true
  }

  /**
   * Send password reset notification
   */
  static async sendPasswordResetNotification(
    to: string,
    userName: string,
    isTemporary: boolean,
    password?: string,
  ): Promise<boolean> {
    return this.sendEmail(to, "password_reset", {
      userName,
      isTemporary,
      password,
      resetTime: new Date().toISOString(),
    })
  }
}
