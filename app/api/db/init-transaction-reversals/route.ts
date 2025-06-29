import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create transaction_reversals table
    await sql`
      CREATE TABLE IF NOT EXISTS transaction_reversals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id VARCHAR(255) NOT NULL,
          reversal_type VARCHAR(50) NOT NULL CHECK (reversal_type IN ('reverse', 'void')),
          service_type VARCHAR(50) NOT NULL,
          reason TEXT NOT NULL,
          amount DECIMAL(15,2) DEFAULT 0,
          fee DECIMAL(15,2) DEFAULT 0,
          customer_name VARCHAR(255),
          phone_number VARCHAR(20),
          account_number VARCHAR(50),
          branch_id VARCHAR(255),
          requested_by VARCHAR(255) NOT NULL,
          requested_at TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
          reviewed_by VARCHAR(255),
          reviewed_at TIMESTAMP,
          review_comments TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_transaction_id ON transaction_reversals(transaction_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_status ON transaction_reversals(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_branch_id ON transaction_reversals(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transaction_reversals_requested_at ON transaction_reversals(requested_at)`

    return NextResponse.json({
      success: true,
      message: "Transaction reversals table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing transaction reversals table:", error)
    return NextResponse.json({ error: "Failed to initialize transaction reversals table" }, { status: 500 })
  }
}
