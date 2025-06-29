import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create E-Zwich Partner Accounts Table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_partner_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id UUID NOT NULL,
          bank_name VARCHAR(100) NOT NULL,
          account_number VARCHAR(20) NOT NULL,
          account_name VARCHAR(100) NOT NULL,
          contact_person VARCHAR(100) NOT NULL,
          contact_phone VARCHAR(20) NOT NULL,
          contact_email VARCHAR(100),
          settlement_time TIME DEFAULT '17:00',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create unique constraint
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'unique_branch_bank_account'
          ) THEN
              ALTER TABLE e_zwich_partner_accounts 
              ADD CONSTRAINT unique_branch_bank_account 
              UNIQUE (branch_id, bank_name, account_number);
          END IF;
      END $$
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_partner_accounts_branch_id ON e_zwich_partner_accounts(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_partner_accounts_active ON e_zwich_partner_accounts(is_active)`

    // Create E-Zwich Settlements Table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_settlements (
          id VARCHAR(50) PRIMARY KEY,
          partner_account_id UUID NOT NULL,
          branch_id UUID NOT NULL,
          amount DECIMAL(15,2) NOT NULL,
          reference TEXT,
          processed_by VARCHAR(100) NOT NULL,
          user_id VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          settlement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for settlements
    await sql`CREATE INDEX IF NOT EXISTS idx_settlements_branch_id ON e_zwich_settlements(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_settlements_date ON e_zwich_settlements(settlement_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_settlements_status ON e_zwich_settlements(status)`

    return NextResponse.json({
      success: true,
      message: "E-Zwich partner accounts tables initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing E-Zwich partner accounts tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize tables",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
