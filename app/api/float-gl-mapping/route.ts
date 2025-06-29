import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Starting float-GL mapping fetch...")

    // Test database connection first
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.CONNECTION_STRING!)

    // Simple test query
    const testResult = await sql`SELECT 1 as test`
    console.log("Database connection test:", testResult)

    // Check if float_accounts table exists
    const floatTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'float_accounts'
      )
    `
    console.log("Float accounts table exists:", floatTableExists[0].exists)

    if (!floatTableExists[0].exists) {
      return NextResponse.json({
        success: false,
        error: "Float accounts table does not exist",
        data: [],
      })
    }

    // Get float accounts with minimal data first
    const floatAccounts = await sql`
      SELECT 
        id,
        provider,
        account_type,
        current_balance,
        branch_id
      FROM float_accounts
      WHERE is_active = true
      LIMIT 10
    `
    console.log("Float accounts fetched:", floatAccounts.length)

    // Get branches
    const branches = await sql`
      SELECT id, name FROM branches LIMIT 50
    `
    console.log("Branches fetched:", branches.length)

    // Check if mapping table exists
    const mappingTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'float_account_gl_mapping'
      )
    `
    console.log("Mapping table exists:", mappingTableExists[0].exists)

    let mappings = []
    if (mappingTableExists[0].exists) {
      mappings = await sql`
        SELECT 
          id,
          float_account_id,
          gl_account_id,
          mapping_type,
          is_active
        FROM float_account_gl_mapping
        WHERE is_active = true
        LIMIT 50
      `
      console.log("Mappings fetched:", mappings.length)
    }

    // Combine data safely
    const result = floatAccounts.map((account) => {
      const branch = branches.find((b) => b.id === account.branch_id)
      const accountMappings = mappings.filter((m) => m.float_account_id === account.id)

      return {
        id: account.id,
        accountName: account.provider || "Unknown",
        accountType: account.account_type || "unknown",
        currentBalance: Number.parseFloat(account.current_balance) || 0,
        branchId: account.branch_id,
        branchName: branch?.name || "Unknown Branch",
        glMappings: accountMappings,
        mainGLAccount: accountMappings.find((m) => m.mapping_type === "main_account"),
        feeGLAccount: accountMappings.find((m) => m.mapping_type === "fee_account"),
        commissionGLAccount: accountMappings.find((m) => m.mapping_type === "commission_account"),
      }
    })

    console.log("Returning result with", result.length, "accounts")

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in float-GL mapping API:", error)
    console.error("Error stack:", error.stack)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error occurred",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("POST request body:", body)

    const { floatAccountId, glAccountId, mappingType } = body

    if (!floatAccountId || !glAccountId || !mappingType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Import the service dynamically to avoid import issues
    const { FloatGLMappingService } = await import("@/lib/float-gl-mapping-service-corrected")

    const success = await FloatGLMappingService.createOrUpdateMapping(floatAccountId, glAccountId, mappingType)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Failed to create mapping" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error creating mapping:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const floatAccountId = searchParams.get("floatAccountId")
    const mappingType = searchParams.get("mappingType")

    if (!floatAccountId || !mappingType) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Import the service dynamically
    const { FloatGLMappingService } = await import("@/lib/float-gl-mapping-service-corrected")

    const success = await FloatGLMappingService.removeMapping(floatAccountId, mappingType)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Failed to remove mapping" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error removing mapping:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
