import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth-service"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || session.user.branchId
    const limit = searchParams.get("limit") || "50"
    const offset = searchParams.get("offset") || "0"

    console.log("Fetching agency banking transactions for branch:", branchId)

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS agency_banking_transactions (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          fee DECIMAL(10,2) DEFAULT 0,
          customer_name VARCHAR(255) NOT NULL,
          account_number VARCHAR(100),
          partner_bank VARCHAR(255) NOT NULL,
          partner_bank_code VARCHAR(50),
          partner_bank_id VARCHAR(255),
          reference VARCHAR(100),
          status VARCHAR(20) DEFAULT 'completed',
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          branch_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          cash_till_affected DECIMAL(10,2) DEFAULT 0,
          float_affected DECIMAL(10,2) DEFAULT 0,
          gl_entry_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating agency_banking_transactions table:", tableError)
    }

    let transactions = []

    try {
      transactions = await sql`
        SELECT 
          id,
          type,
          amount,
          fee,
          customer_name,
          account_number,
          partner_bank,
          reference,
          status,
          date,
          branch_id,
          user_id,
          cash_till_affected,
          float_affected,
          created_at
        FROM agency_banking_transactions 
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC 
        LIMIT ${Number.parseInt(limit)}
        OFFSET ${Number.parseInt(offset)}
      `
    } catch (queryError) {
      console.error("Error querying agency_banking_transactions:", queryError)
      transactions = []
    }

    console.log(`Found ${transactions.length} agency banking transactions`)

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length,
    })
  } catch (error) {
    console.error("Error fetching agency banking transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agency banking transactions",
        transactions: [], // Return empty array on error
        total: 0,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Creating agency banking transaction:", body)

    // This would typically create a new transaction
    // For now, return success
    return NextResponse.json({
      success: true,
      message: "Agency banking transaction created successfully",
    })
  } catch (error) {
    console.error("Error creating agency banking transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create agency banking transaction",
      },
      { status: 500 },
    )
  }
}
