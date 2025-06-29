import { NextResponse } from "next/server"
import { initializeUserTables } from "@/lib/db-init-users"

export async function POST() {
  try {
    console.log("API: Starting user tables initialization...")
    const result = await initializeUserTables()
    console.log("API: User tables initialization result:", result)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to initialize user tables",
          details: result.details,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "User tables initialized successfully",
    })
  } catch (error) {
    console.error("Error in user tables initialization API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize user tables",
        details: [(error as Error).message],
      },
      { status: 500 },
    )
  }
}
