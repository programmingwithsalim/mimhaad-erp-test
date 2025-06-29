import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { GLPostingService } from "@/lib/services/gl-posting-service-enhanced"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    console.log("🔷 [E-ZWICH] Raw request data:", JSON.stringify(requestData, null, 2))

    const {
      type,
      card_number,
      ezwich_settlement_account_id,
      customer_name,
      customer_phone,
      amount,
      fee,
      reference,
      user_id,
      branch_id,
      processed_by,
    } = requestData

    // Validate required fields
    if (!type || !card_number || !ezwich_settlement_account_id || !customer_name || !customer_phone || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Validate transaction type
    if (type !== "withdrawal") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid transaction type",
        },
        { status: 400 },
      )
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(user_id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
        },
        { status: 400 },
      )
    }

    if (!uuidRegex.test(branch_id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid branch ID format",
        },
        { status: 400 },
      )
    }

    if (!uuidRegex.test(ezwich_settlement_account_id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settlement account ID format",
        },
        { status: 400 },
      )
    }

    // Generate transaction reference
    const transactionReference = `EZ-WD-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`

    // Check settlement account balance
    const settlementAccount = await sql`
      SELECT current_balance FROM float_accounts 
      WHERE id = ${ezwich_settlement_account_id} AND is_active = true
    `

    if (settlementAccount.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "E-Zwich settlement account not found or inactive",
        },
        { status: 400 },
      )
    }

    const currentBalance = Number(settlementAccount[0].current_balance)
    const withdrawalAmount = Number(amount)
    const feeAmount = Number(fee || 0)
    const totalAmount = withdrawalAmount + feeAmount

    if (currentBalance < withdrawalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: GHS ${currentBalance.toFixed(2)}, Required: GHS ${withdrawalAmount.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Create withdrawal transaction using the EXISTING schema
    const withdrawalResult = await sql`
      INSERT INTO e_zwich_withdrawals (
        transaction_reference,
        card_number,
        customer_name,
        customer_phone,
        amount,
        fee,
        partner_bank,
        branch_id,
        processed_by,
        ezwich_settlement_account_id,
        reference
      ) VALUES (
        ${transactionReference},
        ${card_number},
        ${customer_name},
        ${customer_phone},
        ${withdrawalAmount},
        ${feeAmount},
        'E-Zwich Ghana',
        ${branch_id},
        ${user_id},
        ${ezwich_settlement_account_id},
        ${reference || null}
      )
      RETURNING *
    `

    // Update settlement account balance (decrease by withdrawal amount)
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = current_balance - ${withdrawalAmount},
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ${ezwich_settlement_account_id}
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
        reference_id,
        processed_by,
        branch_id,
        user_id
      ) VALUES (
        ${ezwich_settlement_account_id},
        'withdrawal',
        ${-withdrawalAmount},
        ${currentBalance},
        ${currentBalance - withdrawalAmount},
        'E-Zwich withdrawal for card ${card_number}',
        ${withdrawalResult[0].id},
        ${processed_by},
        ${branch_id},
        ${user_id}
      )
    `

    const withdrawal = withdrawalResult[0]

    // Post to General Ledger (with error handling)
    try {
      const glResult = await GLPostingService.createEZwichGLEntries({
        transactionId: withdrawal.id,
        type: "withdrawal",
        amount: withdrawalAmount,
        fee: feeAmount,
        cardNumber: card_number,
        customerName: customer_name,
        reference: transactionReference,
        processedBy: user_id,
        branchId: branch_id,
        branchName: "Unknown Branch",
      })

      if (glResult.success) {
        console.log("✅ [E-ZWICH] GL entries created successfully")
      } else {
        console.error("❌ [E-ZWICH] GL posting failed:", glResult.error)
      }
    } catch (glError) {
      console.error("❌ [E-ZWICH] GL posting error:", glError)
      // Don't fail the transaction if GL posting fails
    }

    // Audit log (with error handling)
    try {
      await AuditLoggerService.log({
        userId: user_id,
        username: processed_by || "Unknown User",
        actionType: "ezwich_withdrawal_completed",
        entityType: "ezwich_withdrawal",
        entityId: withdrawal.id,
        description: `E-Zwich withdrawal completed for card ${card_number}`,
        details: {
          cardNumber: card_number,
          customerName: customer_name,
          amount: withdrawalAmount,
          fee: feeAmount,
          settlementAccountId: ezwich_settlement_account_id,
        },
        severity: "medium",
        branchId: branch_id,
        branchName: "Unknown Branch",
        status: "success",
      })
    } catch (auditError) {
      console.error("❌ [E-ZWICH] Audit logging error:", auditError)
      // Don't fail the transaction if audit logging fails
    }

    console.log("✅ [E-ZWICH] Withdrawal processed successfully:", withdrawal.id)

    return NextResponse.json({
      success: true,
      message: "E-Zwich withdrawal processed successfully",
      transaction: {
        id: withdrawal.id,
        reference: withdrawal.transaction_reference,
        card_number: withdrawal.card_number,
        customer_name: withdrawal.customer_name,
        customer_phone: withdrawal.customer_phone,
        amount: Number(withdrawal.amount),
        fee: Number(withdrawal.fee),
        total: Number(withdrawal.total_amount),
        status: withdrawal.status,
        created_at: withdrawal.created_at,
      },
    })
  } catch (error: any) {
    console.error("❌ [E-ZWICH] Error processing withdrawal:", error)
    return NextResponse.json(
      {
        success: false,
        message: "E-Zwich withdrawal failed",
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
