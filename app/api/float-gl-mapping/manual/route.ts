import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Function to detect GL accounts table schema
async function detectGLAccountsSchema() {
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('gl_accounts', 'gl_account', 'general_ledger_accounts')
      AND table_schema = 'public'
    `

    if (tables.length === 0) {
      return null
    }

    const tableName = tables[0].table_name

    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
    `

    const columnNames = columns.map((col) => col.column_name)

    return {
      tableName,
      codeColumn: columnNames.includes("code") ? "code" : null,
      nameColumn: columnNames.includes("name") ? "name" : null,
      typeColumn: columnNames.includes("type") ? "type" : null,
      balanceColumn: columnNames.includes("balance") ? "balance" : null,
      isActiveColumn: columnNames.includes("is_active") ? "is_active" : null,
    }
  } catch (error) {
    console.error("Error detecting schema:", error)
    return null
  }
}

// Function to ensure GL accounts exist
async function ensureGLAccountsExist() {
  try {
    // Check if GL accounts table exists
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'gl_accounts' AND table_schema = 'public'
    `

    if (tables.length === 0) {
      console.log("Creating GL accounts table...")
      await sql`
        CREATE TABLE gl_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          parent_id UUID,
          balance DECIMAL(15,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    }

    // Check if we have basic GL accounts
    const accountCount = await sql`SELECT COUNT(*) as count FROM gl_accounts`

    if (accountCount[0].count === 0) {
      // Create basic GL accounts for MoMo and other services
      const basicAccounts = [
        { code: "1001", name: "Cash in Hand", type: "Asset" },
        { code: "1002", name: "E-Zwich Settlement Account", type: "Asset" },
        { code: "1003", name: "Mobile Money Float", type: "Asset" },
        { code: "1004", name: "Power Float Account", type: "Asset" },
        { code: "1005", name: "Agency Banking Float", type: "Asset" },
        { code: "4001", name: "MoMo Commission Revenue", type: "Revenue" },
        { code: "4002", name: "Agency Banking Revenue", type: "Revenue" },
        { code: "4003", name: "Transaction Fee Income", type: "Revenue" },
        { code: "4004", name: "Power Commission Revenue", type: "Revenue" },
        { code: "4005", name: "E-Zwich Revenue", type: "Revenue" },
        { code: "2001", name: "Customer Liability", type: "Liability" },
        { code: "2002", name: "Merchant Payable", type: "Liability" },
      ]

      for (const account of basicAccounts) {
        await sql`
          INSERT INTO gl_accounts (code, name, type, balance, is_active)
          VALUES (${account.code}, ${account.name}, ${account.type}, 0, true)
          ON CONFLICT (code) DO NOTHING
        `
      }

      console.log("✅ Created basic GL accounts")
    }

    // Ensure float_gl_mappings table exists
    await sql`
      CREATE TABLE IF NOT EXISTS float_gl_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        float_account_id UUID NOT NULL,
        gl_account_id UUID NOT NULL,
        mapping_type VARCHAR(50) NOT NULL CHECK (mapping_type IN ('main_account', 'fee_account', 'commission_account')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(float_account_id, mapping_type)
      )
    `
  } catch (error) {
    console.error("Error ensuring GL accounts exist:", error)
  }
}

export async function GET() {
  try {
    console.log("🔄 Fetching GL mapping data...")

    // Ensure GL accounts exist
    await ensureGLAccountsExist()

    // Detect the GL accounts schema
    const schema = await detectGLAccountsSchema()

    if (!schema || !schema.codeColumn) {
      return NextResponse.json({
        success: false,
        error: "GL accounts table not found or has incompatible schema.",
        floatAccounts: [],
        glAccounts: [],
        mappings: [],
        schemaIssue: true,
        detectedSchema: schema,
      })
    }

    console.log("📋 Detected GL schema:", schema)

    // Fetch float accounts
    let floatAccountsResult = []
    try {
      const floatQueryResult = await sql`
        SELECT 
          fa.id,
          fa.branch_id,
          fa.account_type,
          fa.provider,
          fa.account_number,
          fa.current_balance,
          fa.min_threshold,
          fa.max_threshold,
          fa.created_at,
          COALESCE(b.name, 'Unknown Branch') as branch_name
        FROM float_accounts fa
        LEFT JOIN branches b ON fa.branch_id = b.id
        WHERE fa.is_active = true
        ORDER BY b.name, fa.account_type, fa.provider
      `

      floatAccountsResult = Array.isArray(floatQueryResult) ? floatQueryResult : []
      console.log(`📊 Found ${floatAccountsResult.length} float accounts`)
    } catch (floatError) {
      console.error("⚠️ Error fetching float accounts:", floatError)
      floatAccountsResult = []
    }

    // Fetch GL accounts
    let glAccountsResult = []
    try {
      const glQueryResult = await sql`
        SELECT 
          id,
          code as account_code,
          name as account_name,
          type as account_type,
          COALESCE(balance, 0) as balance,
          COALESCE(is_active, true) as is_active
        FROM gl_accounts
        WHERE COALESCE(is_active, true) = true
        ORDER BY code
      `

      glAccountsResult = Array.isArray(glQueryResult) ? glQueryResult : []
      console.log(`📊 Found ${glAccountsResult.length} GL accounts`)
    } catch (glError) {
      console.error("⚠️ Error fetching GL accounts:", glError)
      glAccountsResult = []
    }

    // Fetch mappings
    let mappingsResult = []
    try {
      const mappingQuery = await sql`
        SELECT 
          fgm.id,
          fgm.float_account_id,
          fgm.gl_account_id,
          fgm.mapping_type,
          fgm.is_active,
          fgm.created_at,
          -- Float account data
          fa.account_type as float_account_type,
          fa.provider as float_provider,
          fa.account_number as float_account_number,
          fa.current_balance as float_balance,
          COALESCE(b.name, 'Unknown Branch') as branch_name,
          -- GL account data
          gl.code as account_code,
          gl.name as account_name,
          gl.type as gl_account_type,
          COALESCE(gl.balance, 0) as gl_balance
        FROM float_gl_mappings fgm
        LEFT JOIN float_accounts fa ON fgm.float_account_id = fa.id
        LEFT JOIN branches b ON fa.branch_id = b.id
        LEFT JOIN gl_accounts gl ON fgm.gl_account_id = gl.id
        WHERE fgm.is_active = true
        ORDER BY fgm.created_at DESC
      `

      mappingsResult = Array.isArray(mappingQuery) ? mappingQuery : []
      console.log(`📊 Found ${mappingsResult.length} mappings`)
    } catch (mappingError) {
      console.error("⚠️ Error fetching mappings:", mappingError)
      mappingsResult = []
    }

    // Transform data
    const floatAccounts = floatAccountsResult.map((account: any) => ({
      id: account.id,
      branch_id: account.branch_id,
      branch_name: account.branch_name || "Unknown Branch",
      account_type: account.account_type,
      provider: account.provider,
      account_number: account.account_number,
      current_balance: Number(account.current_balance) || 0,
      min_threshold: Number(account.min_threshold) || 0,
      max_threshold: Number(account.max_threshold) || 0,
      created_at: account.created_at,
    }))

    const glAccounts = glAccountsResult.map((account: any) => ({
      id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      balance: Number(account.balance) || 0,
      is_active: account.is_active !== false,
    }))

    const mappings = mappingsResult.map((mapping: any) => ({
      id: mapping.id,
      float_account_id: mapping.float_account_id,
      gl_account_id: mapping.gl_account_id,
      mapping_type: mapping.mapping_type,
      is_active: mapping.is_active,
      created_at: mapping.created_at,
      float_account: {
        id: mapping.float_account_id,
        account_type: mapping.float_account_type,
        provider: mapping.float_provider,
        account_number: mapping.float_account_number,
        current_balance: Number(mapping.float_balance) || 0,
        branch_name: mapping.branch_name,
      },
      gl_account: {
        id: mapping.gl_account_id,
        account_code: mapping.account_code,
        account_name: mapping.account_name,
        account_type: mapping.gl_account_type,
        balance: Number(mapping.gl_balance) || 0,
      },
    }))

    console.log("✅ Final data counts:", {
      floatAccounts: floatAccounts.length,
      glAccounts: glAccounts.length,
      mappings: mappings.length,
    })

    return NextResponse.json({
      success: true,
      floatAccounts,
      glAccounts,
      mappings,
      detectedSchema: schema,
      debug: {
        floatAccountsCount: floatAccounts.length,
        glAccountsCount: glAccounts.length,
        mappingsCount: mappings.length,
      },
    })
  } catch (error) {
    console.error("❌ Error fetching GL mapping data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch mapping data",
        floatAccounts: [],
        glAccounts: [],
        mappings: [],
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { float_account_id, gl_account_id, mapping_type } = await request.json()

    if (!float_account_id || !gl_account_id || !mapping_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: float_account_id, gl_account_id, mapping_type",
        },
        { status: 400 },
      )
    }

    // Check if mapping already exists
    const existingMapping = await sql`
      SELECT id FROM float_gl_mappings 
      WHERE float_account_id = ${float_account_id} 
      AND mapping_type = ${mapping_type} 
      AND is_active = true
    `

    if (existingMapping.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `A ${mapping_type.replace("_", " ")} mapping already exists for this float account`,
        },
        { status: 400 },
      )
    }

    // Create new mapping
    const result = await sql`
      INSERT INTO float_gl_mappings (
        float_account_id,
        gl_account_id,
        mapping_type,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${float_account_id},
        ${gl_account_id},
        ${mapping_type},
        true,
        NOW(),
        NOW()
      )
      RETURNING id
    `

    console.log("✅ Created mapping:", result[0])

    return NextResponse.json({
      success: true,
      mapping_id: result[0].id,
      message: "Mapping created successfully",
    })
  } catch (error) {
    console.error("❌ Error creating mapping:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create mapping",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { mapping_id } = await request.json()

    if (!mapping_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing mapping_id",
        },
        { status: 400 },
      )
    }

    // Soft delete the mapping
    const result = await sql`
      UPDATE float_gl_mappings 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${mapping_id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Mapping not found",
        },
        { status: 404 },
      )
    }

    console.log("✅ Deleted mapping:", result[0])

    return NextResponse.json({
      success: true,
      message: "Mapping deleted successfully",
    })
  } catch (error) {
    console.error("❌ Error deleting mapping:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete mapping",
      },
      { status: 500 },
    )
  }
}
