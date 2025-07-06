import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Adding receipt support to commissions table...")

    // Add receipt columns to commissions table
    await sql`
      ALTER TABLE commissions 
      ADD COLUMN IF NOT EXISTS receipt_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS receipt_size INTEGER,
      ADD COLUMN IF NOT EXISTS receipt_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS receipt_data TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS transaction_volume DECIMAL(15,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,4) DEFAULT 0.0000,
      ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)
    `

    // Update existing columns to match our current schema
    await sql`
      ALTER TABLE commissions 
      ALTER COLUMN created_by_id RENAME TO created_by,
      ALTER COLUMN created_by_name RENAME TO created_by_name
    `

    // Add indexes for new columns
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_receipt_filename ON commissions(receipt_filename)`

    console.log("Receipt support added to commissions table successfully")

    return NextResponse.json({
      success: true,
      message: "Receipt support added to commissions table successfully",
      addedColumns: [
        "receipt_filename",
        "receipt_size", 
        "receipt_type",
        "receipt_data",
        "notes",
        "transaction_volume",
        "commission_rate",
        "branch_id",
        "branch_name"
      ],
    })
  } catch (error) {
    console.error("Error adding receipt support to commissions:", error)
    return NextResponse.json(
      {
        error: "Failed to add receipt support to commissions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
} 