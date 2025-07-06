import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("🚀 Starting transaction tables optimization...");

    // Add indexes to momo_transactions table
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_id ON momo_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_date ON momo_transactions(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_status ON momo_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_type ON momo_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_customer_name ON momo_transactions(customer_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_phone_number ON momo_transactions(phone_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_user_id ON momo_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_date ON momo_transactions(branch_id, date DESC)`;

    // Add indexes to agency_banking_transactions table
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_branch_id ON agency_banking_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_date ON agency_banking_transactions(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_status ON agency_banking_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_type ON agency_banking_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_customer_name ON agency_banking_transactions(customer_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_customer_phone ON agency_banking_transactions(customer_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_user_id ON agency_banking_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_branch_date ON agency_banking_transactions(branch_id, date DESC)`;

    // Add indexes to ezwich_transactions table
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_branch_id ON ezwich_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_transaction_date ON ezwich_transactions(transaction_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_status ON ezwich_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_transaction_type ON ezwich_transactions(transaction_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_customer_name ON ezwich_transactions(customer_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_customer_phone ON ezwich_transactions(customer_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_processed_by ON ezwich_transactions(processed_by)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_branch_date ON ezwich_transactions(branch_id, transaction_date DESC)`;

    // Add indexes to power_transactions table
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_branch_id ON power_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_created_at ON power_transactions(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_status ON power_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_type ON power_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_customer_name ON power_transactions(customer_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_customer_phone ON power_transactions(customer_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_user_id ON power_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_branch_date ON power_transactions(branch_id, created_at DESC)`;

    // Add indexes to jumia_transactions table
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_branch_id ON jumia_transactions(branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_created_at ON jumia_transactions(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_status ON jumia_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_type ON jumia_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_customer_name ON jumia_transactions(customer_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_customer_phone ON jumia_transactions(customer_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_user_id ON jumia_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_branch_date ON jumia_transactions(branch_id, created_at DESC)`;

    // Add composite indexes for common query patterns
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_status_date ON momo_transactions(branch_id, status, date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_branch_status_date ON agency_banking_transactions(branch_id, status, date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_branch_status_date ON ezwich_transactions(branch_id, status, transaction_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_branch_status_date ON power_transactions(branch_id, status, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_branch_status_date ON jumia_transactions(branch_id, status, created_at DESC)`;

    // Add text search indexes for customer name and phone number
    await sql`CREATE INDEX IF NOT EXISTS idx_momo_transactions_customer_search ON momo_transactions USING gin(to_tsvector('english', customer_name || ' ' || phone_number))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_customer_search ON agency_banking_transactions USING gin(to_tsvector('english', customer_name || ' ' || customer_phone))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_customer_search ON ezwich_transactions USING gin(to_tsvector('english', customer_name || ' ' || customer_phone))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_power_transactions_customer_search ON power_transactions USING gin(to_tsvector('english', customer_name || ' ' || customer_phone))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jumia_transactions_customer_search ON jumia_transactions USING gin(to_tsvector('english', customer_name || ' ' || customer_phone))`;

    console.log("✅ Transaction tables optimization completed successfully");

    return NextResponse.json({
      success: true,
      message: "Transaction tables optimized with performance indexes",
      indexes: {
        momo_transactions: 9,
        agency_banking_transactions: 9,
        ezwich_transactions: 9,
        power_transactions: 9,
        jumia_transactions: 9,
        composite_indexes: 5,
        search_indexes: 5,
      },
    });
  } catch (error) {
    console.error("Error optimizing transaction tables:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to optimize transaction tables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
