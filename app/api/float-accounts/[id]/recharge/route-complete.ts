import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { amount, recharge_method, reference, notes, user_id, processed_by, branch_id } = await request.json()

    // Validate inputs
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!user_id || !processed_by || !branch_id) {
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
    const rechargeAmount = Number(amount)
    const newBalance = currentBalance + rechargeAmount

    // Update account balance
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = ${newBalance},
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    // Create recharge transaction record
    const rechargeTransaction = await sql`
      INSERT INTO float_recharge_transactions (
        float_account_id,
        amount,
        balance_before,
        balance_after,
        recharge_method,
        reference,
        notes,
        processed_by,
        branch_id,
        user_id,
        status
      ) VALUES (
        ${id},
        ${rechargeAmount},
        ${currentBalance},
        ${newBalance},
        ${recharge_method || "manual"},
        ${reference || `RECHARGE-${Date.now()}`},
        ${notes || ""},
        ${processed_by},
        ${branch_id},
        ${user_id},
        'completed'
      )
      RETURNING *
    `

    // Also create a float transaction record for consistency
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
        user_id,
        reference_transaction_id
      ) VALUES (
        ${id},
        'credit',
        ${rechargeAmount},
        ${currentBalance},
        ${newBalance},
        'Float account recharge - ${recharge_method || "manual"}',
        ${processed_by},
        ${branch_id},
        ${user_id},
        ${rechargeTransaction[0].id}
      )
    `

    return NextResponse.json({
      success: true,
      message: "Float account recharged successfully",
      data: {
        account_id: id,
        previous_balance: currentBalance,
        recharge_amount: rechargeAmount,
        new_balance: newBalance,
        transaction_id: rechargeTransaction[0].id,
      },
    })
  } catch (error: any) {
    console.error("Error recharging float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
