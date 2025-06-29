import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🔄 Initializing GL accounts table...")

    // Read the SQL file
    const sqlFilePath = join(process.cwd(), "db", "schema", "gl-accounts-fixed.sql")
    const sqlContent = readFileSync(sqlFilePath, "utf8")

    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    console.log(`📝 Executing ${statements.length} SQL statements...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}`)
          await sql.unsafe(statement)
        } catch (error) {
          console.error(`Error in statement ${i + 1}:`, error)
          // Continue with other statements
        }
      }
    }

    // Verify the table was created
    const tableCheck = await sql`
      SELECT COUNT(*) as count FROM gl_accounts
    `

    console.log(`✅ GL accounts table initialized with ${tableCheck[0].count} accounts`)

    return NextResponse.json({
      success: true,
      message: `GL accounts table initialized successfully with ${tableCheck[0].count} accounts`,
      accountCount: tableCheck[0].count,
    })
  } catch (error) {
    console.error("❌ Error initializing GL accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize GL accounts",
      },
      { status: 500 },
    )
  }
}
