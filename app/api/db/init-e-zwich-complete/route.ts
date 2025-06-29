import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("🏧 Initializing complete E-Zwich schema...")

    // Enable UUID extension if not already enabled
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

    // Create enum types for better data integrity
    await sql`
      DO $$ BEGIN
          CREATE TYPE card_status AS ENUM ('active', 'inactive', 'blocked', 'expired');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$
    `

    await sql`
      DO $$ BEGIN
          CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$
    `

    await sql`
      DO $$ BEGIN
          CREATE TYPE batch_status AS ENUM ('received', 'in_use', 'depleted', 'expired');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$
    `

    // 1. Card Inventory (Batch Management) Table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_batches (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          batch_code VARCHAR(50) UNIQUE NOT NULL,
          quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
          quantity_issued INTEGER DEFAULT 0 CHECK (quantity_issued >= 0),
          quantity_available INTEGER GENERATED ALWAYS AS (quantity_received - quantity_issued) STORED,
          card_type VARCHAR(50) DEFAULT 'standard',
          expiry_date DATE,
          status batch_status DEFAULT 'received',
          branch_id UUID NOT NULL,
          created_by UUID NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 2. Card Issuance Table (without foreign key constraints initially)
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_issuance (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          card_number VARCHAR(20) UNIQUE NOT NULL,
          batch_id UUID NOT NULL,
          
          -- Customer biodata
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20) NOT NULL,
          customer_email VARCHAR(255),
          date_of_birth DATE,
          gender VARCHAR(10),
          
          -- ID details
          id_type VARCHAR(50),
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
          pin_hash VARCHAR(255),
          card_status card_status DEFAULT 'active',
          issue_date DATE DEFAULT CURRENT_DATE,
          expiry_date DATE,
          
          -- System tracking
          branch_id UUID NOT NULL,
          issued_by UUID NOT NULL,
          fee_charged DECIMAL(10,2) DEFAULT 0.00,
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 3. E-Zwich Withdrawals Table (without foreign key constraints initially)
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_withdrawals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          transaction_reference VARCHAR(50) UNIQUE NOT NULL,
          
          -- Card and customer details
          card_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20) NOT NULL,
          
          -- Transaction details
          withdrawal_amount DECIMAL(12,2) NOT NULL CHECK (withdrawal_amount > 0),
          fee_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (fee_amount >= 0),
          total_amount DECIMAL(12,2) GENERATED ALWAYS AS (withdrawal_amount + fee_amount) STORED,
          
          -- System details
          branch_id UUID NOT NULL,
          processed_by UUID NOT NULL,
          cash_till_account_id UUID,
          e_zwich_settlement_account_id UUID,
          
          -- Transaction status and tracking
          status transaction_status DEFAULT 'pending',
          transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          settlement_date TIMESTAMP WITH TIME ZONE,
          
          -- Additional information
          terminal_id VARCHAR(50),
          receipt_number VARCHAR(50),
          notes TEXT,
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 4. Card Status History Table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_status_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          card_number VARCHAR(20) NOT NULL,
          old_status card_status,
          new_status card_status NOT NULL,
          reason VARCHAR(255),
          changed_by UUID NOT NULL,
          changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 5. E-Zwich Float Account Transactions
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_float_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          withdrawal_id UUID,
          float_account_id UUID NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          balance_before DECIMAL(12,2) NOT NULL,
          balance_after DECIMAL(12,2) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create e_zwich_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        fee DECIMAL(15,2) DEFAULT 0,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        card_number VARCHAR(50),
        reference VARCHAR(100),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        branch_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create e_zwich_card_issuances table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_card_issuances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        customer_email VARCHAR(255),
        card_number VARCHAR(50) NOT NULL,
        card_type VARCHAR(50) DEFAULT 'standard',
        fee_charged DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'issued',
        branch_id UUID NOT NULL,
        user_id UUID NOT NULL,
        issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create e_zwich_withdrawals table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_number VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        fee DECIMAL(15,2) DEFAULT 0,
        customer_name VARCHAR(255),
        reference VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        branch_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create e_zwich_partner_accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS e_zwich_partner_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100),
        bank_name VARCHAR(255) NOT NULL,
        current_balance DECIMAL(15,2) DEFAULT 0,
        settlement_balance DECIMAL(15,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        branch_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_card_batches_branch ON e_zwich_card_batches(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_batches_status ON e_zwich_card_batches(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_batches_created_at ON e_zwich_card_batches(created_at)`

    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_batch ON e_zwich_card_issuance(batch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_branch ON e_zwich_card_issuance(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_customer_phone ON e_zwich_card_issuance(customer_phone)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_status ON e_zwich_card_issuance(card_status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_card_issuance_created_at ON e_zwich_card_issuance(created_at)`

    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_card_number ON e_zwich_withdrawals(card_number)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_branch ON e_zwich_withdrawals(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON e_zwich_withdrawals(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_transaction_date ON e_zwich_withdrawals(transaction_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_reference ON e_zwich_withdrawals(transaction_reference)`

    await sql`CREATE INDEX IF NOT EXISTS idx_status_history_card ON e_zwich_card_status_history(card_number)`
    await sql`CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON e_zwich_card_status_history(changed_at)`

    await sql`CREATE INDEX IF NOT EXISTS idx_float_transactions_withdrawal ON e_zwich_float_transactions(withdrawal_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_float_transactions_account ON e_zwich_float_transactions(float_account_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_float_transactions_created_at ON e_zwich_float_transactions(created_at)`

    await sql`
      CREATE INDEX IF NOT EXISTS idx_e_zwich_transactions_branch_id ON e_zwich_transactions(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_e_zwich_transactions_created_at ON e_zwich_transactions(created_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_e_zwich_card_issuances_branch_id ON e_zwich_card_issuances(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_e_zwich_withdrawals_branch_id ON e_zwich_withdrawals(branch_id)
    `

    console.log("✅ Complete E-Zwich schema initialized successfully")

    // Now add foreign key constraints after all tables exist
    try {
      // Add foreign key constraints for card batches
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_batch_branch' 
            AND table_name = 'e_zwich_card_batches'
          ) THEN
            ALTER TABLE e_zwich_card_batches 
            ADD CONSTRAINT fk_batch_branch 
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_batch_created_by' 
            AND table_name = 'e_zwich_card_batches'
          ) THEN
            ALTER TABLE e_zwich_card_batches 
            ADD CONSTRAINT fk_batch_created_by 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      // Add foreign key constraints for card issuance
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_issuance_batch' 
            AND table_name = 'e_zwich_card_issuance'
          ) THEN
            ALTER TABLE e_zwich_card_issuance 
            ADD CONSTRAINT fk_issuance_batch 
            FOREIGN KEY (batch_id) REFERENCES e_zwich_card_batches(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_issuance_branch' 
            AND table_name = 'e_zwich_card_issuance'
          ) THEN
            ALTER TABLE e_zwich_card_issuance 
            ADD CONSTRAINT fk_issuance_branch 
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_issuance_issued_by' 
            AND table_name = 'e_zwich_card_issuance'
          ) THEN
            ALTER TABLE e_zwich_card_issuance 
            ADD CONSTRAINT fk_issuance_issued_by 
            FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      // Add foreign key constraints for withdrawals
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_withdrawal_card' 
            AND table_name = 'e_zwich_withdrawals'
          ) THEN
            ALTER TABLE e_zwich_withdrawals 
            ADD CONSTRAINT fk_withdrawal_card 
            FOREIGN KEY (card_number) REFERENCES e_zwich_card_issuance(card_number) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_withdrawal_branch' 
            AND table_name = 'e_zwich_withdrawals'
          ) THEN
            ALTER TABLE e_zwich_withdrawals 
            ADD CONSTRAINT fk_withdrawal_branch 
            FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_withdrawal_processed_by' 
            AND table_name = 'e_zwich_withdrawals'
          ) THEN
            ALTER TABLE e_zwich_withdrawals 
            ADD CONSTRAINT fk_withdrawal_processed_by 
            FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      // Add foreign key constraints for status history
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_status_history_card' 
            AND table_name = 'e_zwich_card_status_history'
          ) THEN
            ALTER TABLE e_zwich_card_status_history 
            ADD CONSTRAINT fk_status_history_card 
            FOREIGN KEY (card_number) REFERENCES e_zwich_card_issuance(card_number) ON DELETE CASCADE;
          END IF;
        END $$
      `

      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_status_history_changed_by' 
            AND table_name = 'e_zwich_card_status_history'
          ) THEN
            ALTER TABLE e_zwich_card_status_history 
            ADD CONSTRAINT fk_status_history_changed_by 
            FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT;
          END IF;
        END $$
      `

      // Add foreign key constraints for float transactions
      await sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_float_trans_withdrawal' 
            AND table_name = 'e_zwich_float_transactions'
          ) THEN
            ALTER TABLE e_zwich_float_transactions 
            ADD CONSTRAINT fk_float_trans_withdrawal 
            FOREIGN KEY (withdrawal_id) REFERENCES e_zwich_withdrawals(id) ON DELETE CASCADE;
          END IF;
        END $$
      `

      console.log("Foreign key constraints added successfully")
    } catch (fkError) {
      console.log("Some foreign key constraints may already exist or reference tables don't exist yet:", fkError)
    }

    // Create triggers and functions
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    await sql`DROP TRIGGER IF EXISTS update_card_batches_updated_at ON e_zwich_card_batches`
    await sql`CREATE TRIGGER update_card_batches_updated_at BEFORE UPDATE ON e_zwich_card_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

    await sql`DROP TRIGGER IF EXISTS update_card_issuance_updated_at ON e_zwich_card_issuance`
    await sql`CREATE TRIGGER update_card_issuance_updated_at BEFORE UPDATE ON e_zwich_card_issuance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

    await sql`DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON e_zwich_withdrawals`
    await sql`CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON e_zwich_withdrawals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

    // Create trigger to update batch quantity when card is issued
    await sql`
      CREATE OR REPLACE FUNCTION update_batch_quantity_on_issuance()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Increment quantity_issued in the batch
          UPDATE e_zwich_card_batches 
          SET quantity_issued = quantity_issued + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.batch_id;
          
          -- Update batch status if depleted
          UPDATE e_zwich_card_batches 
          SET status = 'depleted'
          WHERE id = NEW.batch_id 
          AND quantity_issued >= quantity_received;
          
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    await sql`DROP TRIGGER IF EXISTS trigger_update_batch_quantity ON e_zwich_card_issuance`
    await sql`CREATE TRIGGER trigger_update_batch_quantity AFTER INSERT ON e_zwich_card_issuance FOR EACH ROW EXECUTE FUNCTION update_batch_quantity_on_issuance()`

    console.log("Triggers created successfully")

    // Create views for common queries
    await sql`
      CREATE OR REPLACE VIEW v_card_batch_summary AS
      SELECT 
          b.id,
          b.batch_code,
          b.quantity_received,
          b.quantity_issued,
          b.quantity_available,
          b.card_type,
          b.status,
          b.branch_id,
          b.created_by,
          b.created_at,
          b.updated_at
      FROM e_zwich_card_batches b
    `

    await sql`
      CREATE OR REPLACE VIEW v_card_issuance_summary AS
      SELECT 
          ci.id,
          ci.card_number,
          ci.customer_name,
          ci.customer_phone,
          ci.card_status,
          ci.issue_date,
          ci.expiry_date,
          cb.batch_code,
          ci.branch_id,
          ci.issued_by,
          ci.created_at
      FROM e_zwich_card_issuance ci
      LEFT JOIN e_zwich_card_batches cb ON ci.batch_id = cb.id
    `

    await sql`
      CREATE OR REPLACE VIEW v_withdrawal_summary AS
      SELECT 
          w.id,
          w.transaction_reference,
          w.card_number,
          w.customer_name,
          w.customer_phone,
          w.withdrawal_amount,
          w.fee_amount,
          w.total_amount,
          w.status,
          w.transaction_date,
          w.branch_id,
          w.processed_by
      FROM e_zwich_withdrawals w
    `

    console.log("Views created successfully")

    // Insert sample data for testing
    await sql`
      INSERT INTO e_zwich_card_batches (
          batch_code, 
          quantity_received, 
          card_type, 
          expiry_date, 
          branch_id, 
          created_by,
          notes
      ) VALUES 
      (
          'EZ-BATCH-001', 
          1000, 
          'standard', 
          '2025-12-31', 
          '635844ab-029a-43f8-8523-d7882915266a', 
          '635844ab-029a-43f8-8523-d7882915266a',
          'Initial batch for testing'
      ),
      (
          'EZ-BATCH-002', 
          500, 
          'premium', 
          '2025-12-31', 
          '635844ab-029a-43f8-8523-d7882915266a', 
          '635844ab-029a-43f8-8523-d7882915266a',
          'Premium cards batch'
      ) ON CONFLICT (batch_code) DO NOTHING
    `

    console.log("Sample data inserted successfully")

    return NextResponse.json({
      success: true,
      message: "Complete E-Zwich schema initialized successfully",
      details: {
        tables_created: [
          "e_zwich_card_batches",
          "e_zwich_card_issuance",
          "e_zwich_withdrawals",
          "e_zwich_card_status_history",
          "e_zwich_float_transactions",
          "e_zwich_transactions",
          "e_zwich_card_issuances",
          "e_zwich_partner_accounts",
        ],
        views_created: ["v_card_batch_summary", "v_card_issuance_summary", "v_withdrawal_summary"],
        sample_batches_created: 2,
      },
    })
  } catch (error) {
    console.error("❌ Error initializing E-Zwich schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize E-Zwich schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
