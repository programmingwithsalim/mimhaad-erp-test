import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    let floatAccounts
    if (branchId) {
      floatAccounts = await sql`
        SELECT * FROM float_accounts 
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC
      `
    } else {
      floatAccounts = await sql`
        SELECT * FROM float_accounts 
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      accounts: floatAccounts,
    })
  } catch (error) {
    console.error("Error fetching float accounts:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch float accounts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      provider,
      account_type,
      current_balance,
      min_threshold,
      max_threshold,
      is_active = true,
      isEzwichPartner = false,
      branch_id,
    } = body

    console.log("💰 [FLOAT] Creating float account with data:", JSON.stringify(body, null, 2))

    // Validate required fields
    if (!provider || !account_type || !branch_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: provider, account_type, branch_id" },
        { status: 400 },
      )
    }

    // Get user info from headers or use default
    const userId = request.headers.get("x-user-id") || "550e8400-e29b-41d4-a716-446655440000"

    console.log("💰 [FLOAT] Using user ID:", userId)

    // Create the float account
    const result = await sql`
      INSERT INTO float_accounts (
        provider,
        account_type,
        current_balance,
        min_threshold,
        max_threshold,
        is_active,
        isezwichpartner,
        branch_id,
        created_by
      ) VALUES (
        ${provider},
        ${account_type},
        ${current_balance || 0},
        ${min_threshold || 1000},
        ${max_threshold || 50000},
        ${is_active},
        ${isEzwichPartner},
        ${branch_id},
        ${userId}
      )
      RETURNING *
    `

    console.log("✅ [FLOAT] Float account created successfully:", result[0])

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "Float account created successfully",
    })
  } catch (error) {
    console.error("❌ [FLOAT] Error creating float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create float account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
