import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db-init"
import { initializeUserTables } from "@/lib/db-init-users"

export async function POST() {
  try {
    // Initialize core database tables
    const coreResult = await initializeDatabase()

    if (!coreResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to initialize core database tables",
          details: coreResult.details,
        },
        { status: 500 },
      )
    }

    // Initialize user tables
    const userResult = await initializeUserTables()

    if (!userResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to initialize user tables",
          details: userResult.details,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      details: [coreResult.message, userResult.message],
    })
  } catch (error) {
    console.error("Error in database initialization API:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize database",
        details: [(error as Error).message],
      },
      { status: 500 },
    )
  }
}
