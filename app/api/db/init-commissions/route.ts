import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing commissions database...")

    // Create commissions table
    await sql`
      CREATE TABLE IF NOT EXISTS commissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source VARCHAR(50) NOT NULL,
          source_name VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
          month DATE NOT NULL,
          reference VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
          gl_account VARCHAR(20),
          gl_account_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by_id VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL,
          updated_by_id VARCHAR(255),
          updated_by_name VARCHAR(255)
      )
    `

    // Create commission approval flow table
    await sql`
      CREATE TABLE IF NOT EXISTS commission_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
          notes TEXT,
          approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          approved_by_id VARCHAR(255) NOT NULL,
          approved_by_name VARCHAR(255) NOT NULL
      )
    `

    // Create commission payments table
    await sql`
      CREATE TABLE IF NOT EXISTS commission_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
          method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
          received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          bank_account VARCHAR(255),
          reference_number VARCHAR(255),
          notes TEXT,
          processed_by_id VARCHAR(255) NOT NULL,
          processed_by_name VARCHAR(255) NOT NULL,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create commission comments table
    await sql`
      CREATE TABLE IF NOT EXISTS commission_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by_id VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL
      )
    `

    // Create commission metadata table for additional fields
    await sql`
      CREATE TABLE IF NOT EXISTS commission_metadata (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          transaction_volume INTEGER,
          commission_rate VARCHAR(20),
          settlement_period VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_source ON commissions(source)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_approvals_commission_id ON commission_approvals(commission_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_payments_commission_id ON commission_payments(commission_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_comments_commission_id ON commission_comments(commission_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_metadata_commission_id ON commission_metadata(commission_id)`

    // Create updated_at trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions
    `
    await sql`
      CREATE TRIGGER update_commissions_updated_at 
          BEFORE UPDATE ON commissions 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `

    console.log("Commissions database initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Commission tables initialized successfully",
      tables: [
        "commissions",
        "commission_approvals",
        "commission_payments",
        "commission_comments",
        "commission_metadata",
      ],
    })
  } catch (error) {
    console.error("Error initializing commissions database:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize commissions database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
