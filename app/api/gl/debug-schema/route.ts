import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export async function GET() {
  try {
    // Check GL accounts table structure
    const glAccountsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'gl_accounts'
      ORDER BY ordinal_position
    `

    // Check GL journal entries table structure
    const glJournalColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'gl_journal_entries'
      ORDER BY ordinal_position
    `

    // Check if tables exist
    const tablesExist = await sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_name IN ('gl_accounts', 'gl_journal_entries')
    `

    return NextResponse.json({
      success: true,
      tables_exist: tablesExist,
      gl_accounts_columns: glAccountsColumns,
      gl_journal_entries_columns: glJournalColumns,
    })
  } catch (error) {
    console.error("Error checking GL schema:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
