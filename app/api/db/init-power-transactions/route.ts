import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing power transactions table...")

    // Create power_transactions table with proper schema
    await sql`
      CREATE TABLE IF NOT EXISTS power_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'purchase')),
        meter_number VARCHAR(50) NOT NULL,
        provider VARCHAR(20) NOT NULL CHECK (provider IN ('ecg', 'nedco')),
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        commission DECIMAL(15,2) DEFAULT 0,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        branch_id UUID NOT NULL,
        user_id UUID NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_branch_id ON power_transactions(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_user_id ON power_transactions(user_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_reference ON power_transactions(reference)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_created_at ON power_transactions(created_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_type ON power_transactions(type)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_provider ON power_transactions(provider)
    `

    // Create trigger for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_power_transactions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    await sql`
      DROP TRIGGER IF EXISTS trigger_power_transactions_updated_at ON power_transactions
    `

    await sql`
      CREATE TRIGGER trigger_power_transactions_updated_at
        BEFORE UPDATE ON power_transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_power_transactions_updated_at()
    `

    console.log("Power transactions table initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Power transactions table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing power transactions table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize power transactions table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
