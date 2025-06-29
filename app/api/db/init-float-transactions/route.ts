import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing float_transactions table...")

    // Create the float_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS float_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        balance_before DECIMAL(15, 2),
        balance_after DECIMAL(15, 2),
        description TEXT,
        reference VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_float_transactions_account_id ON float_transactions(account_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_float_transactions_created_at ON float_transactions(created_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_float_transactions_type ON float_transactions(transaction_type)
    `

    // Create update timestamp function
    await sql`
      CREATE OR REPLACE FUNCTION update_float_transactions_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_float_transactions_timestamp ON float_transactions
    `

    await sql`
      CREATE TRIGGER update_float_transactions_timestamp
      BEFORE UPDATE ON float_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_float_transactions_timestamp()
    `

    console.log("Float transactions table initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Float transactions table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing float transactions table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize float transactions table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
