import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export async function GET() {
  try {
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time, version() as db_version`

    // Test UUID generation
    const uuidTest = await sql`SELECT gen_random_uuid() as test_uuid`

    // Check if gl_accounts table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gl_accounts'
      ) as table_exists
    `

    return NextResponse.json({
      success: true,
      connection: "OK",
      currentTime: result[0].current_time,
      dbVersion: result[0].db_version,
      uuidSupport: !!uuidTest[0].test_uuid,
      glTableExists: tableExists[0].table_exists,
    })
  } catch (error) {
    console.error("Database connection test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
