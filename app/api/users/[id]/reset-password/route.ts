import { NextResponse } from "next/server"
import { resetUserPassword, getUserById } from "@/lib/user-service"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { newPassword, sendEmail = false } = body

    // Reset the password
    const result = await resetUserPassword(id, newPassword)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
    }

    // Get user details for email notification
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // TODO: Send email notification if requested
    if (sendEmail) {
      console.log(`Would send password reset email to ${user.email}`)
      // Implement email service here
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      password: result.password,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      {
        error: "Failed to reset password",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
