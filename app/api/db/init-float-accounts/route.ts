import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL environment variable is not set" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create float accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS float_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        provider VARCHAR(50),
        account_number VARCHAR(100),
        current_balance DECIMAL(15,2) DEFAULT 0,
        min_threshold DECIMAL(15,2) DEFAULT 0,
        max_threshold DECIMAL(15,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_float_accounts_branch_id ON float_accounts(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_float_accounts_type ON float_accounts(account_type)
    `

    return NextResponse.json({ success: true, message: "Float accounts table initialized successfully" })
  } catch (error) {
    console.error("Error initializing float accounts table:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize float accounts table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
