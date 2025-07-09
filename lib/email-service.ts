/**
 * Mock email service
 * In a real application, this would connect to an actual email provider
 */
export class EmailService {
  /**
   * Send an email notification using Resend
   * @param to Recipient email address
   * @param template Email template to use
   * @param data Data to populate the template
   * @returns Promise that resolves when the email is sent
   */
  static async sendEmail(
    to: string,
    template: EmailTemplate,
    data: Record<string, any>
  ): Promise<boolean> {
    // Fetch API key and sender from system_config
    const { sql } = await import("@/lib/db");
    const configRows = await sql`
      SELECT config_key, config_value FROM system_config WHERE config_key IN ('resend_api_key', 'resend_sender_email', 'resend_from_name')
    `;
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.config_key] = row.config_value;
    }
    const apiKey = config["resend_api_key"];
    const fromEmail = config["resend_sender_email"];
    const fromName = config["resend_from_name"];
    if (!apiKey || !fromEmail) {
      console.error(
        "Resend API key or sender email not configured in system_config"
      );
      return false;
    }
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    // Choose template
    let subject = template;
    let html = JSON.stringify(data);
    try {
      const { EmailTemplates } = await import("@/lib/email-templates");
      if (template === "welcome" && data.userName) {
        subject = EmailTemplates.welcome(data.userName).subject;
        html = EmailTemplates.welcome(data.userName).html;
      } else if (
        template === "password_reset" &&
        data.userName &&
        data.resetLink
      ) {
        subject = EmailTemplates.passwordReset(
          data.userName,
          data.resetLink
        ).subject;
        html = EmailTemplates.passwordReset(data.userName, data.resetLink).html;
      } // Add more templates as needed
    } catch (e) {
      // fallback to default
    }

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });
    const result = await response.json();
    console.log("Resend API response:", result);
    if (!response.ok || result.error) {
      console.error("Failed to send email:", result.error || result);
      return false;
    }
    return true;
  }

  /**
   * Send password reset notification
   */
  static async sendPasswordResetNotification(
    to: string,
    userName: string,
    isTemporary: boolean,
    password?: string
  ): Promise<boolean> {
    return this.sendEmail(to, "password_reset", {
      userName,
      isTemporary,
      password,
      resetTime: new Date().toISOString(),
    });
  }
}
