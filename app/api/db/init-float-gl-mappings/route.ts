import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Create Float GL Mappings Table
    await sql`
      CREATE TABLE IF NOT EXISTS float_gl_mappings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          float_account_id UUID NOT NULL,
          gl_account_id UUID NOT NULL,
          mapping_type VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Add check constraint for mapping_type
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'check_mapping_type'
          ) THEN
              ALTER TABLE float_gl_mappings 
              ADD CONSTRAINT check_mapping_type 
              CHECK (mapping_type IN ('main_account', 'fee_account', 'commission_account'));
          END IF;
      END $$
    `

    // Create unique constraint
    await sql`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'unique_float_mapping_type'
          ) THEN
              ALTER TABLE float_gl_mappings 
              ADD CONSTRAINT unique_float_mapping_type 
              UNIQUE (float_account_id, mapping_type);
          END IF;
      END $$
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_float_gl_mappings_float_account ON float_gl_mappings(float_account_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_float_gl_mappings_gl_account ON float_gl_mappings(gl_account_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_float_gl_mappings_type ON float_gl_mappings(mapping_type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_float_gl_mappings_active ON float_gl_mappings(is_active)`

    return NextResponse.json({
      success: true,
      message: "Float GL mappings table initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing Float GL mappings table:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
