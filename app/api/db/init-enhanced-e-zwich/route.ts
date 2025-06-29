import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing enhanced E-Zwich card issuances table...")

    // Create the enhanced card issuances table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_issuances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_number VARCHAR(10) NOT NULL,
          partner_bank VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          email VARCHAR(255),
          date_of_birth DATE NOT NULL,
          gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
          address TEXT NOT NULL,
          id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('ghana_card', 'voters_id', 'passport', 'drivers_license')),
          id_number VARCHAR(50) NOT NULL,
          customer_photo_url VARCHAR(500),
          id_photo_url VARCHAR(500),
          fee DECIMAL(10,2) NOT NULL DEFAULT 15.00,
          payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'momo', 'bank_transfer')),
          reference TEXT,
          user_id VARCHAR(255) NOT NULL,
          branch_id VARCHAR(255) NOT NULL,
          processed_by VARCHAR(255) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_card_number ON e_zwich_card_issuances(card_number)`
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_customer_name ON e_zwich_card_issuances(customer_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_branch_id ON e_zwich_card_issuances(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_created_at ON e_zwich_card_issuances(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_partner_bank ON e_zwich_card_issuances(partner_bank)`

    console.log("Enhanced E-Zwich card issuances table initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Enhanced E-Zwich card issuances table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing enhanced E-Zwich table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize enhanced E-Zwich table",
      },
      { status: 500 },
    )
  }
}
