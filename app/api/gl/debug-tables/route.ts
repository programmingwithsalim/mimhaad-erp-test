import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get all transaction-related tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        table_name LIKE '%transaction%' OR 
        table_name IN ('commissions', 'expenses', 'float_accounts')
      )
      ORDER BY table_name
    `

    const tableStructures = {}

    // Get column information for each table
    for (const table of tables) {
      try {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${table.table_name}
          ORDER BY ordinal_position
        `

        // Get sample data
        const sampleData = await sql.unsafe(`
          SELECT * FROM ${table.table_name} 
          ORDER BY created_at DESC 
          LIMIT 3
        `)

        tableStructures[table.table_name] = {
          columns,
          sampleCount: sampleData.length,
          sampleData: sampleData.length > 0 ? sampleData[0] : null,
        }
      } catch (error) {
        tableStructures[table.table_name] = {
          error: error.message,
        }
      }
    }

    return NextResponse.json({
      tables: tables.map((t) => t.table_name),
      structures: tableStructures,
    })
  } catch (error) {
    console.error("Error debugging tables:", error)
    return NextResponse.json(
      {
        error: "Failed to debug tables",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
