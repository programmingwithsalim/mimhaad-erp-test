import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Drop and recreate fee_config table with proper constraints
    await sql`
      DROP TABLE IF EXISTS fee_config CASCADE
    `

    await sql`
      CREATE TABLE fee_config (
        id SERIAL PRIMARY KEY,
        service_type VARCHAR(50) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        fee_type VARCHAR(20) DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed')),
        fee_value DECIMAL(10,4) NOT NULL,
        minimum_fee DECIMAL(10,2) DEFAULT 0,
        maximum_fee DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'GHS',
        tier_min_amount DECIMAL(15,2) DEFAULT 0,
        tier_max_amount DECIMAL(15,2),
        is_active BOOLEAN DEFAULT TRUE,
        effective_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        UNIQUE(service_type, transaction_type)
      )
    `

    // Insert default fee configurations
    await sql`
      INSERT INTO fee_config (service_type, transaction_type, fee_type, fee_value, minimum_fee, maximum_fee, currency, is_active) VALUES
      ('momo', 'deposit', 'percentage', 1.5, 1.00, 50.00, 'GHS', true),
      ('momo', 'withdrawal', 'percentage', 2.0, 2.00, 100.00, 'GHS', true),
      ('agency_banking', 'deposit', 'fixed', 5.0, 0, 0, 'GHS', true),
      ('agency_banking', 'withdrawal', 'fixed', 10.0, 0, 0, 'GHS', true),
      ('agency_banking', 'interbank_transfer', 'fixed', 15.0, 0, 0, 'GHS', true),
      ('e_zwich', 'card_issuance', 'fixed', 15.0, 0, 0, 'GHS', true),
      ('e_zwich', 'withdrawal', 'percentage', 1.5, 1.50, 50.00, 'GHS', true),
      ('power', 'transaction', 'percentage', 2.0, 1.00, 25.00, 'GHS', true),
      ('jumia', 'transaction', 'percentage', 1.0, 0.50, 20.00, 'GHS', true),
      ('interbank', 'transfer', 'fixed', 20.0, 0, 0, 'GHS', true),
      ('interbank', 'inquiry', 'fixed', 2.0, 0, 0, 'GHS', true)
      ON CONFLICT (service_type, transaction_type) DO NOTHING
    `

    const fees = await sql`
      SELECT * FROM fee_config 
      WHERE is_active = true
      ORDER BY service_type, transaction_type
    `

    return NextResponse.json({
      success: true,
      data: fees,
    })
  } catch (error) {
    console.error("Error fetching fee config:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch fee configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { fees } = await request.json()

    if (!Array.isArray(fees)) {
      return NextResponse.json({ success: false, error: "Invalid fee data" }, { status: 400 })
    }

    // Update each fee configuration
    for (const fee of fees) {
      const { service_type, transaction_type, fee_value, fee_type, minimum_fee, maximum_fee } = fee

      await sql`
        INSERT INTO fee_config (service_type, transaction_type, fee_type, fee_value, minimum_fee, maximum_fee, updated_at)
        VALUES (${service_type}, ${transaction_type}, ${fee_type || "percentage"}, ${fee_value}, ${minimum_fee || 0}, ${maximum_fee || 0}, NOW())
        ON CONFLICT (service_type, transaction_type) 
        DO UPDATE SET 
          fee_value = EXCLUDED.fee_value,
          fee_type = EXCLUDED.fee_type,
          minimum_fee = EXCLUDED.minimum_fee,
          maximum_fee = EXCLUDED.maximum_fee,
          updated_at = EXCLUDED.updated_at
      `
    }

    return NextResponse.json({
      success: true,
      message: "Fee configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating fee config:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update fee configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
