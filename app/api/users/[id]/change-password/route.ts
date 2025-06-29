import { type NextRequest, NextResponse } from "next/server"
import { changeUserPassword } from "@/lib/user-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 })
    }

    const success = await changeUserPassword(params.id, currentPassword, newPassword)

    if (success) {
      return NextResponse.json({ message: "Password changed successfully" })
    } else {
      return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error changing password:", error)

    if (error instanceof Error) {
      if (error.message === "User not found") {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      if (error.message === "Current password is incorrect") {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
