import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("🏗️ Initializing agency banking database schema...");

    // Create enum types first
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_transaction_type') THEN
          CREATE TYPE agency_transaction_type AS ENUM (
            'deposit',
            'withdrawal',
            'interbank',
            'commission'
          );
        END IF;
      END $$;
    `;

    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_transaction_status') THEN
          CREATE TYPE agency_transaction_status AS ENUM (
            'pending',
            'completed',
            'failed',
            'reversed',
            'disbursed'
          );
        ELSIF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disbursed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agency_transaction_status')) THEN
          ALTER TYPE agency_transaction_status ADD VALUE 'disbursed';
        END IF;
      END $$;
    `;

    // Drop and recreate the table with correct schema
    await sql`DROP TABLE IF EXISTS agency_banking_transactions`;

    await sql`
      CREATE TABLE agency_banking_transactions (
        id VARCHAR(50) PRIMARY KEY,
        type agency_transaction_type NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
        customer_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        partner_bank VARCHAR(100) NOT NULL,
        partner_bank_code VARCHAR(20) NOT NULL,
        partner_bank_id VARCHAR(50) NOT NULL,
        reference TEXT,
        status agency_transaction_status NOT NULL DEFAULT 'pending',
        date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        branch_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        cash_till_affected DECIMAL(15, 2) NOT NULL DEFAULT 0,
        float_affected DECIMAL(15, 2) NOT NULL DEFAULT 0,
        gl_entry_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_branch_id ON agency_banking_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_user_id ON agency_banking_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_date ON agency_banking_transactions(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_status ON agency_banking_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_partner_bank_code ON agency_banking_transactions(partner_bank_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_partner_bank_id ON agency_banking_transactions(partner_bank_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_transactions_account_number ON agency_banking_transactions(account_number)`;

    // Create update trigger function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Create trigger
    await sql`DROP TRIGGER IF EXISTS update_agency_banking_transactions_timestamp ON agency_banking_transactions`;
    await sql`
      CREATE TRIGGER update_agency_banking_transactions_timestamp
      BEFORE UPDATE ON agency_banking_transactions
      FOR EACH ROW EXECUTE FUNCTION update_timestamp()
    `;

    console.log("✅ Agency banking database schema initialized successfully");

    return NextResponse.json({
      success: true,
      message: "Agency banking database schema initialized successfully",
    });
  } catch (error: any) {
    console.error("❌ Error initializing agency banking schema:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize agency banking schema",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
