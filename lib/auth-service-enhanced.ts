import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NotificationService } from "@/lib/services/notification-service"

const sql = neon(process.env.DATABASE_URL!)

export interface LoginResult {
  success: boolean
  user?: any
  token?: string
  error?: string
  requiresPasswordChange?: boolean
}

export interface User {
  id: string
  email: string
  full_name: string
  role: string
  branch_id: string
  is_active: boolean
  last_login?: Date
  password_changed_at?: Date
  created_at: Date
}

export class AuthService {
  static async login(
    email: string,
    password: string,
    metadata?: {
      ipAddress?: string
      userAgent?: string
      location?: string
    },
  ): Promise<LoginResult> {
    try {
      console.log("🔐 Attempting login for:", email)

      // Find user by email
      const users = await sql`
        SELECT 
          id, email, password_hash, full_name, role, branch_id, 
          is_active, last_login, password_changed_at, created_at,
          failed_login_attempts, locked_until
        FROM users 
        WHERE email = ${email.toLowerCase()}
      `

      if (users.length === 0) {
        console.log("❌ User not found:", email)
        return { success: false, error: "Invalid email or password" }
      }

      const user = users[0]

      // Check if user is active
      if (!user.is_active) {
        console.log("❌ User account is inactive:", email)
        return { success: false, error: "Account is inactive. Please contact administrator." }
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        console.log("❌ User account is locked:", email)
        return {
          success: false,
          error: `Account is locked until ${new Date(user.locked_until).toLocaleString()}. Please try again later.`,
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        console.log("❌ Invalid password for:", email)

        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1
        const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null // Lock for 30 minutes after 5 failed attempts

        await sql`
          UPDATE users 
          SET 
            failed_login_attempts = ${failedAttempts},
            locked_until = ${lockUntil}
          WHERE id = ${user.id}
        `

        if (lockUntil) {
          return {
            success: false,
            error: "Too many failed login attempts. Account locked for 30 minutes.",
          }
        }

        return { success: false, error: "Invalid email or password" }
      }

      // Reset failed login attempts on successful login
      await sql`
        UPDATE users 
        SET 
          failed_login_attempts = 0,
          locked_until = NULL,
          last_login = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `

      // Check if password change is required (password older than 90 days)
      const passwordAge = user.password_changed_at
        ? Date.now() - new Date(user.password_changed_at).getTime()
        : Date.now() - new Date(user.created_at).getTime()

      const requiresPasswordChange = passwordAge > 90 * 24 * 60 * 60 * 1000 // 90 days

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "24h" },
      )

      // Create session record
      await sql`
        INSERT INTO user_sessions (
          id, user_id, token_hash, ip_address, user_agent, 
          expires_at, created_at
        ) VALUES (
          gen_random_uuid(),
          ${user.id},
          ${await bcrypt.hash(token, 10)},
          ${metadata?.ipAddress || "unknown"},
          ${metadata?.userAgent || "unknown"},
          ${new Date(Date.now() + 24 * 60 * 60 * 1000)}, -- 24 hours
          CURRENT_TIMESTAMP
        )
      `

      // Send login notification if enabled
      try {
        await NotificationService.sendLoginAlert(user.id, {
          ipAddress: metadata?.ipAddress || "unknown",
          userAgent: metadata?.userAgent || "unknown",
          location: metadata?.location,
          branchId: user.branch_id,
        })
      } catch (notificationError) {
        console.warn("⚠️ Failed to send login notification:", notificationError)
        // Don't fail login if notification fails
      }

      // Log successful login
      console.log("✅ Login successful for:", email)

      const userResponse = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
      }

      return {
        success: true,
        user: userResponse,
        token,
        requiresPasswordChange,
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      return {
        success: false,
        error: "An error occurred during login. Please try again.",
      }
    }
  }

  static async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Invalidate session
      await sql`
        UPDATE user_sessions 
        SET is_active = false, logged_out_at = CURRENT_TIMESTAMP
        WHERE token_hash = ${await bcrypt.hash(token, 10)}
      `

      return { success: true }
    } catch (error) {
      console.error("❌ Logout error:", error)
      return { success: false, error: "Failed to logout" }
    }
  }

  static async verifyToken(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any

      // Check if session is still active
      const sessions = await sql`
        SELECT us.*, u.is_active as user_active
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.token_hash = ${await bcrypt.hash(token, 10)}
          AND us.is_active = true
          AND us.expires_at > CURRENT_TIMESTAMP
      `

      if (sessions.length === 0) {
        return { success: false, error: "Invalid or expired session" }
      }

      const session = sessions[0]

      if (!session.user_active) {
        return { success: false, error: "User account is inactive" }
      }

      return {
        success: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          branchId: decoded.branchId,
        },
      }
    } catch (error) {
      console.error("❌ Token verification error:", error)
      return { success: false, error: "Invalid token" }
    }
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const users = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `

      if (users.length === 0) {
        return { success: false, error: "User not found" }
      }

      const user = users[0]

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)

      if (!isValidPassword) {
        return { success: false, error: "Current password is incorrect" }
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12)

      // Update password
      await sql`
        UPDATE users 
        SET 
          password_hash = ${newPasswordHash},
          password_changed_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `

      console.log("✅ Password changed successfully for user:", userId)
      return { success: true }
    } catch (error) {
      console.error("❌ Password change error:", error)
      return { success: false, error: "Failed to change password" }
    }
  }

  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user
      const users = await sql`
        SELECT id, full_name FROM users WHERE email = ${email.toLowerCase()}
      `

      if (users.length === 0) {
        // Don't reveal if email exists or not
        return { success: true }
      }

      const user = users[0]

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: "password_reset" },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "1h" },
      )

      // Store reset token
      await sql`
        INSERT INTO password_reset_tokens (
          id, user_id, token_hash, expires_at, created_at
        ) VALUES (
          gen_random_uuid(),
          ${user.id},
          ${await bcrypt.hash(resetToken, 10)},
          ${new Date(Date.now() + 60 * 60 * 1000)}, -- 1 hour
          CURRENT_TIMESTAMP
        )
      `

      // In a real implementation, send email with reset link
      console.log("📧 Password reset token generated for:", email)
      console.log("Reset token:", resetToken)

      return { success: true }
    } catch (error) {
      console.error("❌ Password reset error:", error)
      return { success: false, error: "Failed to initiate password reset" }
    }
  }
}
