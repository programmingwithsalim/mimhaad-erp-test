import { type NextRequest, NextResponse } from "next/server"
import { authenticate, createSession } from "@/lib/auth-service"
import { NotificationService } from "@/lib/services/notification-service"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("Login attempt for:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Ensure notifications table exists before attempting to send notifications
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          branch_id VARCHAR(255),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'unread',
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating notifications table:", tableError)
    }

    const user = await authenticate(email, password)

    if (!user) {
      console.log("Authentication failed for:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("Authentication successful for:", email)

    // Create database session
    const session = await createSession(user)

    console.log("Database session created successfully")

    // Send login notification
    try {
      const userAgent = request.headers.get("user-agent") || "Unknown"
      const forwardedFor = request.headers.get("x-forwarded-for")
      const realIp = request.headers.get("x-real-ip")
      const ipAddress = forwardedFor?.split(",")[0] || realIp || "Unknown"

      await NotificationService.sendLoginAlert(user.id, {
        ipAddress,
        userAgent,
        location: "Ghana", // You can enhance this with IP geolocation
        branchId: user.branchId,
      })
    } catch (notificationError) {
      console.error("Failed to send login notification:", notificationError)
      // Don't fail the login if notification fails
    }

    return NextResponse.json({
      user,
      expires: session.expires,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
