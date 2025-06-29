import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🚀 Initializing E-Zwich withdrawals table...")

    // Read and execute the schema
    const schemaPath = path.join(process.cwd(), "db", "schema", "e-zwich-withdrawals.sql")
    const schemaSQL = fs.readFileSync(schemaPath, "utf8")

    // Split by semicolon and execute each statement
    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement)
      }
    }

    console.log("✅ E-Zwich withdrawals table initialized successfully")

    return NextResponse.json({
      success: true,
      message: "E-Zwich withdrawals table initialized successfully",
    })
  } catch (error) {
    console.error("❌ Error initializing E-Zwich withdrawals table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize E-Zwich withdrawals table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
