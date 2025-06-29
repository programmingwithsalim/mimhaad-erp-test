import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("🔄 [GL] Initializing complete GL accounts for float accounts...")

    // Check if gl_accounts table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'gl_accounts'
      )
    `

    if (!tableExists[0]?.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "GL accounts table does not exist",
          details: "Please initialize GL tables first",
        },
        { status: 400 },
      )
    }

    // Clear existing accounts (optional - remove if you want to keep existing)
    await sql`DELETE FROM gl_accounts WHERE code LIKE '1100-%' OR code LIKE '1200-%' OR code LIKE '1300-%' OR code LIKE '1400-%' OR code LIKE '1500-%' OR code LIKE '4100-%' OR code LIKE '4200-%'`

    // Insert all GL accounts for float account types
    const insertResult = await sql`
      -- MOMO ACCOUNTS
      INSERT INTO gl_accounts (id, code, name, type, category, description, is_active, created_at, updated_at) VALUES
      (gen_random_uuid(), '1100-001', 'MTN MoMo Float', 'Asset', 'Current Assets', 'MTN Mobile Money float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-001', 'MTN MoMo Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from MTN MoMo transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-001', 'MTN MoMo Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from MTN MoMo services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      (gen_random_uuid(), '1100-002', 'Vodafone Cash Float', 'Asset', 'Current Assets', 'Vodafone Cash float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-002', 'Vodafone Cash Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from Vodafone Cash transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-002', 'Vodafone Cash Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from Vodafone Cash services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      (gen_random_uuid(), '1100-003', 'AirtelTigo Money Float', 'Asset', 'Current Assets', 'AirtelTigo Money float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-003', 'AirtelTigo Money Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from AirtelTigo Money transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-003', 'AirtelTigo Money Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from AirtelTigo Money services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      -- AGENCY BANKING ACCOUNTS
      (gen_random_uuid(), '1200-001', 'GCB Agency Banking Float', 'Asset', 'Current Assets', 'GCB Bank agency banking float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-101', 'GCB Agency Banking Fees', 'Revenue', 'Service Revenue', 'Fees earned from GCB agency banking services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-101', 'GCB Agency Banking Commission', 'Revenue', 'Commission Revenue', 'Commission earned from GCB agency banking', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      (gen_random_uuid(), '1200-002', 'Ecobank Agency Banking Float', 'Asset', 'Current Assets', 'Ecobank agency banking float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-102', 'Ecobank Agency Banking Fees', 'Revenue', 'Service Revenue', 'Fees earned from Ecobank agency banking services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-102', 'Ecobank Agency Banking Commission', 'Revenue', 'Commission Revenue', 'Commission earned from Ecobank agency banking', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      -- E-ZWICH ACCOUNTS
      (gen_random_uuid(), '1300-001', 'E-Zwich Float', 'Asset', 'Current Assets', 'E-Zwich card services float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-201', 'E-Zwich Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from E-Zwich transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-201', 'E-Zwich Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from E-Zwich services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      (gen_random_uuid(), '1300-002', 'E-Zwich Card Inventory', 'Asset', 'Inventory', 'E-Zwich card inventory asset', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-202', 'E-Zwich Card Issuance Fees', 'Revenue', 'Service Revenue', 'Fees earned from E-Zwich card issuance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-202', 'E-Zwich Card Issuance Commission', 'Revenue', 'Commission Revenue', 'Commission earned from card issuance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      -- POWER ACCOUNTS
      (gen_random_uuid(), '1400-001', 'ECG Power Float', 'Asset', 'Current Assets', 'ECG electricity credit float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-301', 'ECG Power Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from ECG power transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-301', 'ECG Power Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from ECG power sales', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      (gen_random_uuid(), '1400-002', 'NEDCO Power Float', 'Asset', 'Current Assets', 'NEDCO electricity credit float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-302', 'NEDCO Power Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from NEDCO power transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-302', 'NEDCO Power Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from NEDCO power sales', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      -- JUMIA ACCOUNTS
      (gen_random_uuid(), '1500-001', 'Jumia Payment Float', 'Asset', 'Current Assets', 'Jumia payment services float balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-401', 'Jumia Payment Transaction Fees', 'Revenue', 'Service Revenue', 'Fees earned from Jumia payment transactions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-401', 'Jumia Payment Commission Revenue', 'Revenue', 'Commission Revenue', 'Commission earned from Jumia payment services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      
      -- CASH-IN-TILL ACCOUNTS
      (gen_random_uuid(), '1010-001', 'Cash in Till', 'Asset', 'Current Assets', 'Physical cash held in branch till', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4100-501', 'Cash Handling Fees', 'Revenue', 'Service Revenue', 'Fees earned from cash handling services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (gen_random_uuid(), '4200-501', 'Cash Service Commission', 'Revenue', 'Commission Revenue', 'Commission earned from cash services', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `

    // Count inserted accounts
    const countResult = await sql`
      SELECT COUNT(*) as count FROM gl_accounts 
      WHERE code LIKE '1100-%' OR code LIKE '1200-%' OR code LIKE '1300-%' 
         OR code LIKE '1400-%' OR code LIKE '1500-%' OR code LIKE '4100-%' 
         OR code LIKE '4200-%' OR code LIKE '1010-001'
    `

    const accountCount = countResult[0]?.count || 0

    console.log(`✅ [GL] Successfully created ${accountCount} GL accounts for float account types`)

    return NextResponse.json({
      success: true,
      message: `Successfully created ${accountCount} GL accounts for all float account types`,
      accounts_created: accountCount,
      details: {
        momo_accounts: 9, // 3 providers × 3 accounts each
        agency_banking_accounts: 9, // 3 banks × 3 accounts each
        ezwich_accounts: 6, // 2 types × 3 accounts each
        power_accounts: 6, // 2 providers × 3 accounts each
        jumia_accounts: 3, // 1 provider × 3 accounts
        cash_accounts: 3, // 1 type × 3 accounts
      },
    })
  } catch (error) {
    console.error("❌ [GL] Error creating GL accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create GL accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
