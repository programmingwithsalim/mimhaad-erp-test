import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Adding amount and transaction fields to transaction_reversals table...")

    // Add columns to transaction_reversals table
    await sql`
      ALTER TABLE transaction_reversals 
      ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fee DECIMAL(15,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255)
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_amount ON transaction_reversals(amount)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_customer ON transaction_reversals(customer_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_phone ON transaction_reversals(phone_number)`

    console.log("Successfully added columns to transaction_reversals table")

    return NextResponse.json({
      success: true,
      message: "Successfully added amount and transaction fields to transaction_reversals table",
    })
  } catch (error) {
    console.error("Error adding columns to transaction_reversals:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add columns to transaction_reversals table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
