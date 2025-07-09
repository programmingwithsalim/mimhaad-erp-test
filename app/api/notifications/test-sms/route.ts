import { NextResponse } from "next/server";
import { NotificationService } from "@/lib/services/notification-service";
import { getSession } from "@/lib/auth-service-db";

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only send SMS, not email or push
    const prefs = await NotificationService.getUserNotificationSettings(session.user.id);
    if (!prefs?.phone_number) {
      return NextResponse.json({ success: false, error: "No phone number configured" });
    }

    const result = await NotificationService["sendSMSNotification"](
      {
        type: "system_alert",
        title: "Test SMS Notification",
        message: "This is a test SMS to verify your SMS notification settings.",
        userId: session.user.id,
        priority: "low",
      },
      prefs
    );

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Test SMS sent" : result.error,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to send test SMS" },
      { status: 500 }
    );
  }
} 