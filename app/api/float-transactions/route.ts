import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)
    const accountId = searchParams.get("accountId")
    const type = searchParams.get("type")
    const branchId = searchParams.get("branchId")

    // Build the query based on filters
    let query = `
      SELECT 
        ft.*,
        fa.account_type,
        fa.provider,
        b.name as branch_name
      FROM float_transactions ft
      LEFT JOIN float_accounts fa ON ft.float_account_id = fa.id
      LEFT JOIN branches b ON ft.branch_id = b.id
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramIndex = 1

    if (accountId) {
      query += ` AND ft.float_account_id = $${paramIndex++}`
      queryParams.push(accountId)
    }

    if (type) {
      query += ` AND ft.transaction_type = $${paramIndex++}`
      queryParams.push(type)
    }

    if (branchId) {
      query += ` AND ft.branch_id = $${paramIndex++}`
      queryParams.push(branchId)
    }

    query += ` ORDER BY ft.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limit, offset)

    const transactions = await sql.unsafe(query, queryParams)

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
    })
  } catch (error) {
    console.error("Error fetching float transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch float transactions",
        transactions: [],
      },
      { status: 500 },
    )
  }
}
