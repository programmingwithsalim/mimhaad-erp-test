import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.CONNECTION_STRING!)

export async function GET() {
  try {
    console.log("Fetching GL accounts...")

    // Check if GL accounts table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'gl_accounts'
      )
    `

    if (!tableExists[0].exists) {
      console.log("GL accounts table does not exist")
      return NextResponse.json({
        success: false,
        error: "GL accounts table does not exist. Please initialize the system first.",
        accounts: [],
      })
    }

    // First, check what columns actually exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gl_accounts'
      ORDER BY ordinal_position
    `

    console.log(
      "Available columns:",
      columns.map((c) => c.column_name),
    )

    // Get all GL accounts with only existing columns
    const accounts = await sql`
      SELECT 
        id, 
        code as account_code, 
        name as account_name, 
        type as account_type, 
        parent_id,
        COALESCE(balance, 0) as balance,
        COALESCE(is_active, true) as is_active,
        created_at,
        updated_at
      FROM gl_accounts 
      WHERE COALESCE(is_active, true) = true
      ORDER BY code
    `

    console.log(`Found ${accounts.length} GL accounts`)

    // Log first few accounts for debugging
    if (accounts.length > 0) {
      console.log("Sample accounts:", accounts.slice(0, 3))
    }

    return NextResponse.json({
      success: true,
      accounts: accounts,
      count: accounts.length,
      timestamp: new Date().toISOString(),
      columns: columns.map((c) => c.column_name),
    })
  } catch (error) {
    console.error("Error fetching GL accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch GL accounts",
        accounts: [],
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { account_code, account_name, account_type, parent_id, description, is_active = true } = body

    if (!account_code || !account_name || !account_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Check if account code already exists
    const existing = await sql`
      SELECT id FROM gl_accounts WHERE code = ${account_code}
    `

    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "Account code already exists" }, { status: 400 })
    }

    // Create new account with UUID generation
    const result = await sql`
      INSERT INTO gl_accounts (
        id,
        code, 
        name, 
        type, 
        parent_id, 
        is_active, 
        balance,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${account_code}, 
        ${account_name}, 
        ${account_type}, 
        ${parent_id || null}, 
        ${is_active}, 
        0,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "GL account created successfully",
    })
  } catch (error) {
    console.error("Error creating GL account:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create GL account",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}
