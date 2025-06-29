import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("=== TESTING TABLE DATA ===")

    const results = {}

    // Test each table individually with simple queries
    const tablesToTest = [
      "momo_transactions",
      "agency_banking_transactions",
      "ezwich_transactions",
      "power_transactions",
      "jumia_transactions",
      "commissions",
      "expenses",
    ]

    for (const tableName of tablesToTest) {
      try {
        console.log(`\n--- Testing ${tableName} ---`)

        // Get count
        const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`
        const count = Number(countResult[0]?.count || 0)
        console.log(`${tableName} count:`, count)

        // Get columns
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = ${tableName} 
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `
        console.log(
          `${tableName} columns:`,
          columns.map((c) => `${c.column_name} (${c.data_type})`),
        )

        // Get sample data if any exists
        let sampleData = []
        if (count > 0) {
          sampleData = await sql`SELECT * FROM ${sql(tableName)} LIMIT 3`
          console.log(`${tableName} sample data:`, sampleData)
        }

        results[tableName] = {
          count,
          columns: columns.map((c) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable,
          })),
          sampleData: sampleData.slice(0, 2), // Only include 2 records to avoid too much data
        }
      } catch (error) {
        console.log(`Error testing ${tableName}:`, error.message)
        results[tableName] = {
          error: error.message,
          count: 0,
          columns: [],
          sampleData: [],
        }
      }
    }

    console.log("=== TEST RESULTS SUMMARY ===")
    Object.entries(results).forEach(([table, data]: [string, any]) => {
      console.log(`${table}: ${data.count || 0} records, ${data.columns?.length || 0} columns`)
    })

    return NextResponse.json({
      success: true,
      results,
      summary: Object.entries(results).map(([table, data]: [string, any]) => ({
        table,
        count: data.count || 0,
        hasData: (data.count || 0) > 0,
        error: data.error || null,
      })),
    })
  } catch (error) {
    console.error("Error testing table data:", error)
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
