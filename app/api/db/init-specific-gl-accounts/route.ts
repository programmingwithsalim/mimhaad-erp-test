import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🏦 Initializing specific GL accounts...")

    // Insert all the specific GL accounts
    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1100-001', 'MTN MoMo Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-001', 'MTN MoMo Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-001', 'MTN MoMo Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1100-002', 'Vodafone Cash Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-002', 'Vodafone Cash Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-002', 'Vodafone Cash Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1100-003', 'AirtelTigo Money Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-003', 'AirtelTigo Money Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-003', 'AirtelTigo Money Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1200-001', 'GCB Agency Banking Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-101', 'GCB Agency Banking Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-101', 'GCB Agency Banking Commission', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1200-002', 'Ecobank Agency Banking Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-102', 'Ecobank Agency Banking Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-102', 'Ecobank Agency Banking Commission', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1200-003', 'Fidelity Agency Banking Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-103', 'Fidelity Agency Banking Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-103', 'Fidelity Agency Banking Commission', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1300-001', 'E-Zwich Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-201', 'E-Zwich Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-201', 'E-Zwich Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1300-002', 'E-Zwich Card Inventory', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-202', 'E-Zwich Card Issuance Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-202', 'E-Zwich Card Issuance Commission', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1400-001', 'ECG Power Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-301', 'ECG Power Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-301', 'ECG Power Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1400-002', 'NEDCO Power Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-302', 'NEDCO Power Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-302', 'NEDCO Power Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1500-001', 'Jumia Payment Float', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-401', 'Jumia Payment Transaction Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-401', 'Jumia Payment Commission Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1010-001', 'Cash in Till', 'Asset', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-501', 'Cash Handling Fees', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-501', 'Cash Service Commission', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '5000-001', 'Transaction Processing Costs', 'Expense', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '5000-002', 'Float Management Expenses', 'Expense', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4000-001', 'Other Service Revenue', 'Revenue', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '2100-001', 'Customer Deposits Payable', 'Liability', null, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `

    // Count total accounts created
    const accountCount = await sql`
      SELECT COUNT(*) as count FROM gl_accounts WHERE is_active = true
    `

    console.log("✅ Specific GL accounts initialized successfully")

    return NextResponse.json({
      success: true,
      message: "Specific GL accounts initialized successfully",
      totalAccounts: accountCount[0].count,
    })
  } catch (error) {
    console.error("❌ Error initializing specific GL accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize specific GL accounts",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
