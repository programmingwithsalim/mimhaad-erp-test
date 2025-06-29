import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🚀 Starting complete GL tables initialization...")

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "db", "schema", "gl-tables-complete.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    // Execute the SQL
    await sql(sqlContent)

    console.log("✅ GL tables initialized successfully")

    return NextResponse.json({
      success: true,
      message: "GL tables initialized successfully",
    })
  } catch (error) {
    console.error("❌ Error initializing GL tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize GL tables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
