import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch ID is required",
        },
        { status: 400 },
      )
    }

    // Get E-Zwich partner accounts for the branch
    const accounts = await sql`
      SELECT 
        id,
        account_number,
        provider,
        current_balance,
        account_type,
        is_active,
        is_ezwich_partner
      FROM float_accounts 
      WHERE branch_id = ${branchId} 
        AND is_active = true 
        AND (
          account_type = 'e-zwich' 
          OR is_ezwich_partner = true
          OR provider ILIKE '%ezwich%'
          OR provider ILIKE '%settlement%'
        )
      ORDER BY provider ASC
    `

    console.log(`✅ [E-ZWICH-PARTNERS] Found ${accounts.length} E-Zwich partner accounts for branch ${branchId}`)

    return NextResponse.json({
      success: true,
      accounts: accounts.map((account) => ({
        id: account.id,
        account_number: account.account_number,
        provider: account.provider,
        current_balance: Number(account.current_balance),
        account_type: account.account_type,
        is_active: account.is_active,
        is_ezwich_partner: account.is_ezwich_partner,
      })),
    })
  } catch (error: any) {
    console.error("❌ [E-ZWICH-PARTNERS] Error fetching accounts:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch E-Zwich partner accounts",
      },
      { status: 500 },
    )
  }
}
