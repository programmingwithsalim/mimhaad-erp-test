import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    console.log("Initializing E-Zwich card issuance table...")

    // Create the card issuance table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_issuance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_number VARCHAR(20) UNIQUE NOT NULL,
        batch_id UUID,
        
        -- Customer biodata
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255),
        date_of_birth DATE,
        gender VARCHAR(10),
        
        -- ID details
        id_type VARCHAR(50), -- 'national_id', 'passport', 'drivers_license', 'voters_id'
        id_number VARCHAR(50),
        id_expiry_date DATE,
        
        -- Address information
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        region VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'Ghana',
        
        -- Card details
        pin_hash VARCHAR(255), -- Hashed PIN for security
        card_status VARCHAR(20) DEFAULT 'active',
        issue_date DATE DEFAULT CURRENT_DATE,
        expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 years'),
        
        -- System tracking
        branch_id UUID NOT NULL,
        issued_by UUID NOT NULL,
        fee_charged DECIMAL(10,2) DEFAULT 15.00,
        
        -- Photo storage
        customer_photo TEXT, -- Base64 encoded photo or file path
        reference TEXT,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Check constraints
        CONSTRAINT chk_card_number_format CHECK (card_number ~ '^[0-9]{16,20}$'),
        CONSTRAINT chk_phone_format CHECK (customer_phone ~ '^[+]?[0-9]{10,15}$'),
        CONSTRAINT chk_fee_non_negative CHECK (fee_charged >= 0)
      );
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_branch ON e_zwich_card_issuance(branch_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_customer_phone ON e_zwich_card_issuance(customer_phone);`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_status ON e_zwich_card_issuance(card_status);`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_created_at ON e_zwich_card_issuance(created_at);`

    // Create trigger for updated_at timestamp
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `

    await sql`
      DROP TRIGGER IF EXISTS update_card_issuance_updated_at ON e_zwich_card_issuance;
      CREATE TRIGGER update_card_issuance_updated_at 
          BEFORE UPDATE ON e_zwich_card_issuance 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Create the withdrawals table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_reference VARCHAR(50) UNIQUE NOT NULL,
        card_number VARCHAR(20) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        withdrawal_amount DECIMAL(12,2) NOT NULL,
        fee_amount DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(12,2) GENERATED ALWAYS AS (withdrawal_amount + fee_amount) STORED,
        branch_id UUID NOT NULL,
        processed_by UUID NOT NULL,
        ezwich_settlement_account_id UUID,
        status VARCHAR(20) DEFAULT 'completed',
        transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reference TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `

    // Create indexes for withdrawals
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_branch ON e_zwich_withdrawals(branch_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_card_number ON e_zwich_withdrawals(card_number);`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON e_zwich_withdrawals(status);`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON e_zwich_withdrawals(created_at);`

    console.log("E-Zwich card issuance and withdrawal tables initialized successfully")

    return NextResponse.json({
      success: true,
      message: "E-Zwich card issuance and withdrawal tables initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing E-Zwich tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize E-Zwich tables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
