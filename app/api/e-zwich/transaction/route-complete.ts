import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("🏧 [E-ZWICH] Processing transaction:", body)

    const {
      type,
      card_number,
      partner_float_id,
      customer_name,
      customer_phone,
      amount,
      fee,
      note,
      user_id,
      branch_id,
      processed_by,
    } = body

    // Validate required fields
    if (!type || !card_number || !customer_name || !amount || !user_id || !branch_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Generate transaction ID
    const transactionId = `ezw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (type === "withdrawal") {
      // Get partner float account if specified
      let partnerBank = "E-Zwich Ghana"
      if (partner_float_id) {
        const floatAccount = await sql`
          SELECT provider FROM float_accounts WHERE id = ${partner_float_id}
        `
        if (floatAccount.length > 0) {
          partnerBank = floatAccount[0].provider
        }
      }

      // Insert withdrawal record - using correct column names from your schema
      const withdrawal = await sql`
        INSERT INTO e_zwich_withdrawals (
          id,
          transaction_reference,
          card_number,
          customer_name,
          amount,
          fee,
          partner_bank,
          customer_phone,
          branch_id,
          processed_by,
          ezwich_settlement_account_id,
          status,
          reference,
          created_at
        ) VALUES (
          ${transactionId},
          ${transactionId},
          ${card_number},
          ${customer_name},
          ${amount},
          ${fee || 0},
          ${partnerBank},
          ${customer_phone},
          ${branch_id},
          ${user_id},
          ${partner_float_id},
          'completed',
          ${note || ""},
          NOW()
        )
        RETURNING *
      `

      // Update settlement account balance if specified
      if (partner_float_id) {
        const totalAmount = Number(amount) + Number(fee || 0)

        // Check current balance
        const accountCheck = await sql`
          SELECT current_balance FROM float_accounts WHERE id = ${partner_float_id}
        `

        if (accountCheck.length > 0) {
          const currentBalance = Number(accountCheck[0].current_balance)

          if (currentBalance < totalAmount) {
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient settlement balance. Available: GHS ${currentBalance.toFixed(2)}, Required: GHS ${totalAmount.toFixed(2)}`,
              },
              { status: 400 },
            )
          }

          // Update balance
          const newBalance = currentBalance - totalAmount
          await sql`
            UPDATE float_accounts 
            SET current_balance = ${newBalance}, last_updated = NOW()
            WHERE id = ${partner_float_id}
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
              ${partner_float_id},
              'debit',
              ${totalAmount},
              ${currentBalance},
              ${newBalance},
              'E-Zwich withdrawal for ${customer_name} - Card: ${card_number}',
              ${processed_by || "Unknown"},
              ${branch_id},
              ${user_id},
              ${transactionId}
            )
          `
        }
      }

      console.log("✅ [E-ZWICH] Withdrawal completed:", transactionId)

      return NextResponse.json({
        success: true,
        message: "Withdrawal processed successfully",
        transaction: {
          id: withdrawal[0].id,
          type: "withdrawal",
          cardNumber: withdrawal[0].card_number,
          customerName: withdrawal[0].customer_name,
          amount: Number(withdrawal[0].amount),
          fee: Number(withdrawal[0].fee),
          reference: withdrawal[0].reference,
          status: withdrawal[0].status,
          date: withdrawal[0].created_at,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid transaction type",
      },
      { status: 400 },
    )
  } catch (error: any) {
    console.error("❌ [E-ZWICH] Transaction error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process transaction",
      },
      { status: 500 },
    )
  }
}
