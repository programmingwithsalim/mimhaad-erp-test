import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get GL accounts from database
    const accounts = await sql`
      SELECT 
        id,
        code,
        name,
        type,
        category,
        balance,
        is_active,
        created_at,
        updated_at
      FROM gl_accounts 
      WHERE is_active = true
      ORDER BY code
    `

    // Get account balances
    const balances = await sql`
      SELECT 
        account_id,
        current_balance,
        last_updated
      FROM gl_account_balances
    `

    // Merge accounts with their balances
    const accountsWithBalances = accounts.map((account) => {
      const balance = balances.find((b) => b.account_id === account.id)
      return {
        ...account,
        balance: balance?.current_balance || 0,
        last_updated: balance?.last_updated || account.updated_at,
      }
    })

    return NextResponse.json({
      success: true,
      accounts: accountsWithBalances,
      total_accounts: accountsWithBalances.length,
    })
  } catch (error) {
    console.error("Error fetching GL accounts from database:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch GL accounts from database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
