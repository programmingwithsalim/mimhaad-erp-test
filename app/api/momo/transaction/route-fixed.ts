import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("🏦 [MOMO] Processing transaction:", body)

    const {
      type,
      amount,
      fee,
      phone_number,
      customer_name,
      reference,
      float_account_id,
      provider,
      user_id,
      branch_id,
      username,
      branchName,
    } = body

    // Validate required fields
    if (!type || !amount || !phone_number || !customer_name || !float_account_id || !user_id || !branch_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Generate transaction ID
    const transactionId = `momo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Get float account details
    const floatAccount = await sql`
      SELECT * FROM float_accounts WHERE id = ${float_account_id}
    `

    if (floatAccount.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Float account not found",
        },
        { status: 404 },
      )
    }

    const account = floatAccount[0]
    const currentBalance = Number(account.current_balance)
    const transactionAmount = Number(amount)
    const transactionFee = Number(fee) || 0

    // Check balance for cash-out transactions
    if (type === "cash-out" && currentBalance < transactionAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient float balance. Available: GHS ${currentBalance.toFixed(2)}, Required: GHS ${transactionAmount.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Calculate new balance
    let newBalance = currentBalance
    if (type === "cash-in") {
      newBalance = currentBalance + transactionAmount
    } else if (type === "cash-out") {
      newBalance = currentBalance - transactionAmount
    }

    // Insert transaction
    const transaction = await sql`
      INSERT INTO momo_transactions (
        id,
        transaction_type,
        customer_name,
        phone_number,
        amount,
        fee,
        provider,
        reference,
        float_account_id,
        user_id,
        branch_id,
        processed_by,
        status,
        created_at
      ) VALUES (
        ${transactionId},
        ${type},
        ${customer_name},
        ${phone_number},
        ${transactionAmount},
        ${transactionFee},
        ${provider},
        ${reference || transactionId},
        ${float_account_id},
        ${user_id},
        ${branch_id},
        ${username || "Unknown"},
        'completed',
        NOW()
      )
      RETURNING *
    `

    // Update float account balance
    await sql`
      UPDATE float_accounts 
      SET current_balance = ${newBalance}, last_updated = NOW()
      WHERE id = ${float_account_id}
    `

    // Create float transaction record
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
        ${float_account_id},
        ${type === "cash-in" ? "credit" : "debit"},
        ${transactionAmount},
        ${currentBalance},
        ${newBalance},
        'MoMo ${type} transaction for ${customer_name}',
        ${username || "Unknown"},
        ${branch_id},
        ${user_id},
        ${transactionId}
      )
    `

    console.log("✅ [MOMO] Transaction completed:", transactionId)

    return NextResponse.json({
      success: true,
      message: "Transaction processed successfully",
      transaction: {
        id: transaction[0].id,
        type: transaction[0].transaction_type,
        customerName: transaction[0].customer_name,
        phoneNumber: transaction[0].phone_number,
        amount: Number(transaction[0].amount),
        fee: Number(transaction[0].fee),
        provider: transaction[0].provider,
        reference: transaction[0].reference,
        status: transaction[0].status,
        date: transaction[0].created_at,
        branchName: branchName || "Unknown Branch",
      },
    })
  } catch (error: any) {
    console.error("❌ [MOMO] Transaction error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process transaction",
      },
      { status: 500 },
    )
  }
}
