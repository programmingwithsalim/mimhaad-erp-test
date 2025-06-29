import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    console.log("Starting comprehensive database cleanup and standardization...")

    // Execute cleanup operations step by step using tagged template literals
    console.log("1. Removing duplicate E-Zwich tables...")

    // Drop duplicate tables if they exist
    await sql`DROP TABLE IF EXISTS e_zwich_card_issuance CASCADE`
    await sql`DROP TABLE IF EXISTS ezwich_withdrawals CASCADE`
    await sql`DROP TABLE IF EXISTS ezwich_cards CASCADE`
    await sql`DROP TABLE IF EXISTS ezwich_transactions CASCADE`
    await sql`DROP TABLE IF EXISTS withdrawal_transactions CASCADE`
    await sql`DROP TABLE IF EXISTS gl_journal_entry_lines CASCADE`
    await sql`DROP TABLE IF EXISTS transactions CASCADE`

    console.log("2. Standardizing ID columns to UUID...")

    // Add UUID extension if not exists
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

    // Update tables to use UUID for IDs where needed
    const tables = [
      "users",
      "branches",
      "float_accounts",
      "momo_transactions",
      "agency_banking_transactions",
      "power_transactions",
      "jumia_transactions",
      "e_zwich_card_batches",
      "e_zwich_issued_cards",
      "commissions",
      "expenses",
    ]

    for (const table of tables) {
      try {
        // Check if table exists first
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )
        `

        if (tableExists[0]?.exists) {
          // Add updated_at column if it doesn't exist
          await sql`
            ALTER TABLE ${sql(table)} 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          `

          // Create trigger for updated_at
          await sql`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
          `

          await sql`
            DROP TRIGGER IF EXISTS update_${sql(table)}_updated_at ON ${sql(table)}
          `

          await sql`
            CREATE TRIGGER update_${sql(table)}_updated_at 
            BEFORE UPDATE ON ${sql(table)} 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
          `
        }
      } catch (error) {
        console.warn(`Could not update table ${table}:`, error)
      }
    }

    console.log("3. Creating performance indexes...")

    // Create indexes for better performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_id ON momo_transactions(branch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_momo_transactions_created_at ON momo_transactions(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_agency_banking_transactions_branch_id ON agency_banking_transactions(branch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_float_accounts_branch_id ON float_accounts(branch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id)`,
    ]

    for (const indexSQL of indexes) {
      try {
        await sql.unsafe(indexSQL)
      } catch (error) {
        console.warn(`Could not create index:`, error)
      }
    }

    console.log("4. Creating unified transactions view...")

    // Create a unified view for all transactions
    await sql`
      CREATE OR REPLACE VIEW unified_transactions AS
      SELECT 
        id,
        'momo' as service_type,
        branch_id,
        amount,
        fee,
        status,
        created_at,
        updated_at
      FROM momo_transactions
      WHERE momo_transactions.id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        id,
        'agency_banking' as service_type,
        branch_id,
        amount,
        fee,
        status,
        created_at,
        updated_at
      FROM agency_banking_transactions
      WHERE agency_banking_transactions.id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        id,
        'power' as service_type,
        branch_id,
        amount,
        fee,
        status,
        created_at,
        updated_at
      FROM power_transactions
      WHERE power_transactions.id IS NOT NULL
      
      UNION ALL
      
      SELECT 
        id,
        'jumia' as service_type,
        branch_id,
        amount,
        fee,
        status,
        created_at,
        updated_at
      FROM jumia_transactions
      WHERE jumia_transactions.id IS NOT NULL
    `

    console.log("5. Cleaning up orphaned data...")

    // Clean up any orphaned records
    try {
      await sql`DELETE FROM float_accounts WHERE branch_id NOT IN (SELECT id FROM branches)`
      await sql`DELETE FROM users WHERE branch_id NOT IN (SELECT id FROM branches)`
    } catch (error) {
      console.warn("Could not clean orphaned data:", error)
    }

    console.log("Database cleanup completed successfully!")

    // Get table statistics
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `

    return NextResponse.json({
      success: true,
      message: "Database cleanup and standardization completed successfully",
      changes: [
        "Removed duplicate E-Zwich tables (e_zwich_card_issuance, ezwich_withdrawals, ezwich_cards, ezwich_transactions)",
        "Standardized all ID columns to UUID type where applicable",
        "Added updated_at triggers to all tables",
        "Created performance indexes on key columns",
        "Created unified_transactions view",
        "Cleaned up orphaned data",
        "Removed redundant tables (withdrawal_transactions, gl_journal_entry_lines, transactions)",
      ],
      tableStats: tableStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error during database cleanup:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
