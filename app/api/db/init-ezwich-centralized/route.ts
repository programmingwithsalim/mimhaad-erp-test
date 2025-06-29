import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "DATABASE_URL environment variable is not set" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create E-Zwich card batches table
    await sql`
      CREATE TABLE IF NOT EXISTS ezwich_card_batches (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(50) UNIQUE NOT NULL,
        batch_size INTEGER NOT NULL,
        start_card_number VARCHAR(20) NOT NULL,
        end_card_number VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create E-Zwich issued cards table
    await sql`
      CREATE TABLE IF NOT EXISTS ezwich_issued_cards (
        id SERIAL PRIMARY KEY,
        card_number VARCHAR(20) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        branch_id UUID,
        issued_by VARCHAR(255),
        card_type VARCHAR(50) DEFAULT 'standard'
      )
    `

    // Create E-Zwich transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS ezwich_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        card_number VARCHAR(20) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        fee DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        branch_id UUID,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ezwich_cards_branch ON ezwich_issued_cards(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_branch ON ezwich_transactions(branch_id)
    `

    return NextResponse.json({
      success: true,
      message: "E-Zwich centralized database schema initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing E-Zwich centralized schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize E-Zwich centralized schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
