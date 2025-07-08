import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/services/notification-service"
import { getSession } from "@/lib/auth-service-db"

export async function POST(request: Request) {
  try {
    const session = await getSession(request)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Sending test notification for user:", session.user.id)

    const result = await NotificationService.sendTestNotification(session.user.id)

    return NextResponse.json({
      success: true,
      message: "Test notification sent",
      result,
    })
  } catch (error) {
    console.error("Error sending test notification:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
