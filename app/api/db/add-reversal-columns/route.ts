import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("🔧 Adding reversal columns to transaction tables...");

    // Add is_reversal column to momo_transactions
    await sql`
      ALTER TABLE momo_transactions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    // Add original_transaction_id column to momo_transactions
    await sql`
      ALTER TABLE momo_transactions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    // Add indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_is_reversal 
      ON momo_transactions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_original_id 
      ON momo_transactions(original_transaction_id)
    `;

    // Add the same columns to other transaction tables for consistency
    // Agency Banking
    await sql`
      ALTER TABLE agency_banking_transactions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE agency_banking_transactions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agency_transactions_is_reversal 
      ON agency_banking_transactions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_agency_transactions_original_id 
      ON agency_banking_transactions(original_transaction_id)
    `;

    // E-Zwich
    await sql`
      ALTER TABLE e_zwich_withdrawals 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE e_zwich_withdrawals 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_is_reversal 
      ON e_zwich_withdrawals(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ezwich_transactions_original_id 
      ON e_zwich_withdrawals(original_transaction_id)
    `;

    // Power
    await sql`
      ALTER TABLE power_transactions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE power_transactions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_is_reversal 
      ON power_transactions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_power_transactions_original_id 
      ON power_transactions(original_transaction_id)
    `;

    // Jumia
    await sql`
      ALTER TABLE jumia_transactions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE jumia_transactions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_transactions_is_reversal 
      ON jumia_transactions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_transactions_original_id 
      ON jumia_transactions(original_transaction_id)
    `;

    // Commissions
    await sql`
      ALTER TABLE commissions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE commissions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_is_reversal 
      ON commissions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_original_id 
      ON commissions(original_transaction_id)
    `;

    // Expenses
    await sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_is_reversal 
      ON expenses(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_original_id 
      ON expenses(original_transaction_id)
    `;

    // Cash transactions
    await sql`
      ALTER TABLE cash_transactions 
      ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE
    `;

    await sql`
      ALTER TABLE cash_transactions 
      ADD COLUMN IF NOT EXISTS original_transaction_id UUID
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cash_transactions_is_reversal 
      ON cash_transactions(is_reversal)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cash_transactions_original_id 
      ON cash_transactions(original_transaction_id)
    `;

    console.log(
      "✅ Reversal columns added successfully to all transaction tables"
    );

    return NextResponse.json({
      success: true,
      message: "Reversal columns added successfully to all transaction tables",
    });
  } catch (error) {
    console.error("❌ Error adding reversal columns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add reversal columns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
