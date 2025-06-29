import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("🔍 [E-ZWICH] Fetching transactions for branch:", branchId)

    // Initialize empty arrays
    let withdrawalTransactions: any[] = []
    let cardIssuances: any[] = []

    try {
      // Get withdrawal transactions
      if (branchId) {
        withdrawalTransactions = await sql`
          SELECT 
            id,
            'withdrawal' as type,
            amount,
            fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_transactions
          WHERE branch_id = ${branchId}
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `
      } else {
        withdrawalTransactions = await sql`
          SELECT 
            id,
            'withdrawal' as type,
            amount,
            fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_transactions
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `
      }
    } catch (error) {
      console.log("⚠️ [E-ZWICH] No withdrawal transactions table or data")
      withdrawalTransactions = []
    }

    try {
      // Get card issuances
      if (branchId) {
        cardIssuances = await sql`
          SELECT 
            id,
            'card_issuance' as type,
            fee as amount,
            0 as fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_card_issuances
          WHERE branch_id = ${branchId}
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `
      } else {
        cardIssuances = await sql`
          SELECT 
            id,
            'card_issuance' as type,
            fee as amount,
            0 as fee,
            customer_name,
            card_number,
            reference,
            status,
            created_at,
            partner_bank
          FROM e_zwich_card_issuances
          ORDER BY created_at DESC 
          LIMIT ${limit}
        `
      }
    } catch (error) {
      console.log("⚠️ [E-ZWICH] No card issuances table or data")
      cardIssuances = []
    }

    // Combine and sort all transactions
    const allTransactions = [...withdrawalTransactions, ...cardIssuances].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    console.log(`✅ [E-ZWICH] Found ${allTransactions.length} transactions`)

    return NextResponse.json({
      success: true,
      transactions: allTransactions.slice(0, limit),
      total: allTransactions.length,
    })
  } catch (error) {
    console.error("❌ [E-ZWICH] Error fetching transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch E-Zwich transactions",
        transactions: [], // Return empty array instead of undefined
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
