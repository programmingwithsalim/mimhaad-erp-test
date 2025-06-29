import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    console.log("Testing database connection...")

    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable not found",
          details: "Please configure your database connection string",
        },
        { status: 500 },
      )
    }

    // Create SQL client
    const sql = neon(process.env.DATABASE_URL)

    // Test basic connection with a simple query
    console.log("Executing test query...")
    const timeResult = await sql`SELECT NOW() as current_time`
    console.log("Time query result:", timeResult)

    const currentTime = timeResult && timeResult.length > 0 ? timeResult[0]?.current_time : null

    // Check if any settings tables exist
    console.log("Checking for existing tables...")
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('system_config', 'fee_config', 'roles', 'user_roles', 'audit_logs')
      ORDER BY table_name
    `
    console.log("Tables query result:", tablesResult)

    const existingTables = Array.isArray(tablesResult) ? tablesResult.map((row) => row.table_name).filter(Boolean) : []

    console.log("Existing tables:", existingTables)

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      currentTime: currentTime || "Unknown",
      existingTables,
      tablesCount: existingTables.length,
      databaseUrl: process.env.DATABASE_URL ? "Configured" : "Not configured",
    })
  } catch (error) {
    console.error("Database connection test failed:", error)

    // Provide more specific error information
    let errorMessage = "Database connection failed"
    let errorDetails = "Unknown error"

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        databaseUrl: process.env.DATABASE_URL ? "Configured" : "Not configured",
      },
      { status: 500 },
    )
  }
}
