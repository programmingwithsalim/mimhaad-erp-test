import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("🔄 Fetching GL mapping data (safe mode)...")

    // Initialize empty arrays as fallbacks
    let floatAccounts = []
    let glAccounts = []
    let mappings = []

    // Check if tables exist first
    const tablesExist = await sql`
      SELECT 
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'float_accounts')) as float_accounts_exists,
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gl_accounts')) as gl_accounts_exists,
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'float_gl_mappings')) as mappings_exists,
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'branches')) as branches_exists
    `

    const tableStatus = tablesExist[0]
    console.log("📋 Table status:", tableStatus)

    // Fetch float accounts if table exists
    if (tableStatus.float_accounts_exists) {
      try {
        const floatResult = await sql`
          SELECT 
            fa.id,
            fa.branch_id,
            fa.account_type,
            fa.provider,
            fa.account_number,
            COALESCE(fa.current_balance, 0) as current_balance,
            COALESCE(fa.min_threshold, 0) as min_threshold,
            COALESCE(fa.max_threshold, 0) as max_threshold,
            fa.created_at,
            CASE 
              WHEN ${tableStatus.branches_exists} THEN COALESCE(b.name, 'Unknown Branch')
              ELSE 'Unknown Branch'
            END as branch_name
          FROM float_accounts fa
          ${tableStatus.branches_exists ? "LEFT JOIN branches b ON fa.branch_id = b.id" : ""}
          ORDER BY fa.account_type, fa.provider
        `

        floatAccounts = Array.isArray(floatResult)
          ? floatResult.map((account: any) => ({
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
          : []

        console.log("✅ Float accounts fetched:", floatAccounts.length)
      } catch (error) {
        console.error("⚠️ Error fetching float accounts:", error)
      }
    }

    // Fetch GL accounts if table exists
    if (tableStatus.gl_accounts_exists) {
      try {
        // First, detect the schema
        const columns = await sql`
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_name = 'gl_accounts'
        `

        const columnNames = columns.map((col) => col.column_name)
        console.log("📋 GL accounts columns:", columnNames)

        // Determine column mappings
        const codeCol = columnNames.includes("account_code")
          ? "account_code"
          : columnNames.includes("code")
            ? "code"
            : "id"
        const nameCol = columnNames.includes("account_name")
          ? "account_name"
          : columnNames.includes("name")
            ? "name"
            : "id"
        const typeCol = columnNames.includes("account_type")
          ? "account_type"
          : columnNames.includes("type")
            ? "type"
            : "'Unknown'"
        const balanceCol = columnNames.includes("balance")
          ? "balance"
          : columnNames.includes("current_balance")
            ? "current_balance"
            : "0"

        const glResult = await sql.unsafe(`
          SELECT 
            id,
            ${codeCol} as account_code,
            ${nameCol} as account_name,
            ${typeCol} as account_type,
            COALESCE(${balanceCol}, 0) as balance,
            COALESCE(is_active, true) as is_active
          FROM gl_accounts
          ORDER BY ${codeCol}
        `)

        glAccounts = Array.isArray(glResult)
          ? glResult.map((account: any) => ({
              id: account.id,
              account_code: account.account_code || account.id,
              account_name: account.account_name || "Unnamed Account",
              account_type: account.account_type || "Unknown",
              balance: Number(account.balance) || 0,
              is_active: account.is_active !== false,
            }))
          : []

        console.log("✅ GL accounts fetched:", glAccounts.length)
      } catch (error) {
        console.error("⚠️ Error fetching GL accounts:", error)
      }
    }

    // Fetch mappings if table exists
    if (tableStatus.mappings_exists && tableStatus.float_accounts_exists && tableStatus.gl_accounts_exists) {
      try {
        const mappingResult = await sql`
          SELECT 
            fgm.id,
            fgm.float_account_id,
            fgm.gl_account_id,
            fgm.mapping_type,
            fgm.is_active,
            fgm.created_at
          FROM float_gl_mappings fgm
          WHERE fgm.is_active = true
          ORDER BY fgm.created_at DESC
        `

        const rawMappings = Array.isArray(mappingResult) ? mappingResult : []

        // Enrich mappings with related data
        mappings = rawMappings.map((mapping: any) => {
          const floatAccount = floatAccounts.find((fa: any) => fa.id === mapping.float_account_id)
          const glAccount = glAccounts.find((ga: any) => ga.id === mapping.gl_account_id)

          return {
            id: mapping.id,
            float_account_id: mapping.float_account_id,
            gl_account_id: mapping.gl_account_id,
            mapping_type: mapping.mapping_type,
            is_active: mapping.is_active,
            created_at: mapping.created_at,
            float_account: floatAccount || {
              id: mapping.float_account_id,
              account_type: "Unknown",
              provider: "Unknown",
              current_balance: 0,
              branch_name: "Unknown Branch",
            },
            gl_account: glAccount || {
              id: mapping.gl_account_id,
              account_code: "Unknown",
              account_name: "Unknown Account",
              account_type: "Unknown",
              balance: 0,
            },
          }
        })

        console.log("✅ Mappings fetched:", mappings.length)
      } catch (error) {
        console.error("⚠️ Error fetching mappings:", error)
      }
    }

    console.log("📊 Final results:", {
      floatAccounts: floatAccounts.length,
      glAccounts: glAccounts.length,
      mappings: mappings.length,
    })

    return NextResponse.json({
      success: true,
      floatAccounts,
      glAccounts,
      mappings,
      tableStatus,
    })
  } catch (error) {
    console.error("❌ Error in safe GL mapping fetch:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch mapping data",
        floatAccounts: [],
        glAccounts: [],
        mappings: [],
      },
      { status: 500 },
    )
  }
}
