import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { amount, user_id, processed_by } = await request.json()

    // Validate inputs
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!user_id || !processed_by) {
      return NextResponse.json({ error: "User information required" }, { status: 400 })
    }

    // Get current account details
    const account = await sql`
      SELECT * FROM float_accounts WHERE id = ${id}
    `

    if (account.length === 0) {
      return NextResponse.json({ error: "Float account not found" }, { status: 404 })
    }

    const currentAccount = account[0]
    const currentBalance = Number(currentAccount.current_balance)
    const refillAmount = Number(amount)
    const newBalance = currentBalance + refillAmount

    // Update account balance
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = ${newBalance},
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    // Create transaction record
    await sql`
      INSERT INTO float_transactions (
        float_account_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        processed_by,
        branch_id,
        user_id
      ) VALUES (
        ${id},
        'refill',
        ${refillAmount},
        ${currentBalance},
        ${newBalance},
        'Manual float account refill',
        ${processed_by},
        ${currentAccount.branch_id},
        ${user_id}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Float account refilled successfully",
      data: {
        account_id: id,
        previous_balance: currentBalance,
        refill_amount: refillAmount,
        new_balance: newBalance,
      },
    })
  } catch (error: any) {
    console.error("Error refilling float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
