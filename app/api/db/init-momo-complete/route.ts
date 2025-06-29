import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing MoMo database tables...")

    // 1. Create momo_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS momo_transactions (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('cash-in', 'cash-out')),
        amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
        fee DECIMAL(15,2) DEFAULT 0 CHECK (fee >= 0),
        phone_number VARCHAR(20) NOT NULL,
        reference TEXT,
        customer_name VARCHAR(255) NOT NULL,
        float_account_id VARCHAR(255),
        user_id VARCHAR(255) NOT NULL,
        processed_by VARCHAR(255) NOT NULL,
        branch_id VARCHAR(255) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 2. Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_branch_id ON momo_transactions(branch_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_user_id ON momo_transactions(user_id)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_created_at ON momo_transactions(created_at)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_momo_transactions_provider ON momo_transactions(provider)
    `

    // 3. Ensure float_accounts table exists
    await sql`
      CREATE TABLE IF NOT EXISTS float_accounts (
        id VARCHAR(255) PRIMARY KEY,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        provider VARCHAR(100),
        current_balance DECIMAL(15,2) DEFAULT 0,
        min_threshold DECIMAL(15,2) DEFAULT 0,
        max_threshold DECIMAL(15,2) DEFAULT 100000,
        branch_id VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 4. Ensure audit_logs table exists
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        username VARCHAR(255) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255),
        description TEXT NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        branch_id VARCHAR(255),
        branch_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 5. Ensure GL tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id VARCHAR(255) PRIMARY KEY,
        account_code VARCHAR(20) UNIQUE NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        parent_account_id VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS gl_transactions (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_number VARCHAR(50) UNIQUE NOT NULL,
        date DATE NOT NULL,
        source_module VARCHAR(50) NOT NULL,
        source_transaction_id VARCHAR(255) NOT NULL,
        source_transaction_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'reversed')),
        created_by VARCHAR(255) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS gl_transaction_entries (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        gl_transaction_id VARCHAR(255) NOT NULL,
        account_id VARCHAR(255) NOT NULL,
        account_code VARCHAR(20) NOT NULL,
        debit_amount DECIMAL(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
        credit_amount DECIMAL(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
        description TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gl_transaction_id) REFERENCES gl_transactions(id) ON DELETE CASCADE
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS account_balances (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id VARCHAR(255) NOT NULL,
        balance_date DATE NOT NULL,
        opening_balance DECIMAL(15,2) DEFAULT 0,
        closing_balance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, balance_date)
      )
    `

    // 6. Insert basic GL accounts if they don't exist
    await sql`
      INSERT INTO chart_of_accounts (id, account_code, account_name, account_type)
      VALUES 
        ('acc-1001', '1001', 'Cash', 'Asset'),
        ('acc-2001', '2001', 'Customer Liability', 'Liability'),
        ('acc-4003', '4003', 'Fee Income', 'Revenue')
      ON CONFLICT (account_code) DO NOTHING
    `

    // 7. Insert sample float accounts if they don't exist
    await sql`
      INSERT INTO float_accounts (id, account_name, account_type, provider, current_balance, branch_id)
      VALUES 
        ('float-mtn-1', 'MTN Mobile Money Float', 'momo_float', 'MTN Mobile Money', 10000.00, 'branch-1'),
        ('float-voda-1', 'Vodafone Cash Float', 'momo_float', 'Vodafone Cash', 8000.00, 'branch-1'),
        ('float-airtel-1', 'AirtelTigo Money Float', 'momo_float', 'AirtelTigo Money', 6000.00, 'branch-1'),
        ('cash-till-1', 'Cash in Till', 'cash_till', NULL, 5000.00, 'branch-1')
      ON CONFLICT (id) DO NOTHING
    `

    console.log("MoMo database tables initialized successfully")

    return NextResponse.json({
      success: true,
      message: "MoMo database tables initialized successfully",
      tables: [
        "momo_transactions",
        "float_accounts",
        "audit_logs",
        "chart_of_accounts",
        "gl_transactions",
        "gl_transaction_entries",
        "account_balances",
      ],
    })
  } catch (error) {
    console.error("Error initializing MoMo database:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize MoMo database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
