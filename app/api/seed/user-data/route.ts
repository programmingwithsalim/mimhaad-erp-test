import { NextResponse } from "next/server"
import { seedUsers } from "@/lib/seed-user-data"

export async function POST(request: Request) {
  try {
    // Get password from request body if provided
    const body = await request.json().catch(() => ({}))
    const defaultPassword = body.defaultPassword || "password123"

    console.log("API: Starting user data seeding...")

    // Seed the database
    const result = await seedUsers(defaultPassword)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to seed user data",
          details: result.errors,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${result.usersCreated} users`,
      details: result.errors.length > 0 ? result.errors : undefined,
      users: [
        { email: "admin@example.com", password: defaultPassword, role: "Admin" },
        { email: "msalim@example.com", password: defaultPassword, role: "Manager" },
        { email: "jane.smith@example.com", password: defaultPassword, role: "Cashier" },
        { email: "michael.johnson@example.com", password: defaultPassword, role: "Supervisor" },
        { email: "emily.brown@example.com", password: defaultPassword, role: "Cashier" },
      ],
    })
  } catch (error) {
    console.error("Error in seed user data API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed user data",
        details: [(error as Error).message],
      },
      { status: 500 },
    )
  }
}
