import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const branchId = params.id

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    // Get float accounts for the specific branch
    const accounts = await sql`
      SELECT 
        fa.*,
        b.name as branch_name,
        b.code as branch_code
      FROM float_accounts fa
      LEFT JOIN branches b ON fa.branch_id = b.id
      WHERE fa.branch_id = ${branchId}
      AND fa.is_active = true
      ORDER BY fa.account_type, fa.provider, fa.created_at DESC
    `

    // Format the response
    const formattedAccounts = accounts.map((account) => ({
      id: account.id,
      branch_id: account.branch_id,
      branch_name: account.branch_name || "Unknown Branch",
      account_type: account.account_type,
      provider: account.provider,
      current_balance: Number(account.current_balance || 0),
      min_threshold: Number(account.min_threshold || 0),
      max_threshold: Number(account.max_threshold || 0),
      last_updated: account.updated_at || account.created_at,
      created_at: account.created_at,
      status: account.is_active ? "active" : "inactive",
      account_number: account.account_number,
      is_active: account.is_active,
    }))

    return NextResponse.json({
      success: true,
      accounts: formattedAccounts,
      branch_id: branchId,
      total: formattedAccounts.length,
    })
  } catch (error) {
    console.error("Error fetching branch float accounts:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch float accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
