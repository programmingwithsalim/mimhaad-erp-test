import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { GLPostingService } from "@/lib/services/gl-posting-service-enhanced"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    console.log("🔷 [MOMO] Processing transaction:", JSON.stringify(requestData, null, 2))

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
      processed_by,
      branch_id,
      username,
      branchName,
    } = requestData

    // Validate required fields
    if (!type || !amount || !phone_number || !customer_name || !float_account_id || !provider) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidRegex.test(user_id)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 })
    }

    if (!uuidRegex.test(branch_id)) {
      return NextResponse.json({ error: "Invalid branch ID format" }, { status: 400 })
    }

    if (!uuidRegex.test(float_account_id)) {
      return NextResponse.json({ error: "Invalid float account ID format" }, { status: 400 })
    }

    // Generate transaction reference
    const transactionReference =
      reference ||
      `MOMO-${Date.now()}-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`

    // Ensure MoMo tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS momo_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_reference VARCHAR(100) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        fee DECIMAL(12,2) DEFAULT 0,
        provider VARCHAR(100) NOT NULL,
        float_account_id UUID NOT NULL,
        branch_id UUID NOT NULL,
        processed_by VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        cash_till_affected DECIMAL(12,2) DEFAULT 0,
        float_affected DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Check MoMo float account balance
    const momoAccount = await sql`
      SELECT current_balance FROM float_accounts 
      WHERE id = ${float_account_id} AND is_active = true
    `

    if (momoAccount.length === 0) {
      return NextResponse.json({ error: "MoMo float account not found or inactive" }, { status: 400 })
    }

    const currentBalance = Number(momoAccount[0].current_balance)
    const transactionAmount = Number(amount)
    const feeAmount = Number(fee || 0)

    // Calculate effects on cash till and float
    let cashTillAffected = 0
    let floatAffected = 0

    if (type === "cash-in") {
      // Customer gives cash, we credit their MoMo account
      // Cash till increases, MoMo float decreases
      cashTillAffected = transactionAmount
      floatAffected = -transactionAmount

      if (currentBalance < transactionAmount) {
        return NextResponse.json(
          {
            error: `Insufficient MoMo float. Available: GHS ${currentBalance.toFixed(2)}, Required: GHS ${transactionAmount.toFixed(2)}`,
          },
          { status: 400 },
        )
      }
    } else if (type === "cash-out") {
      // Customer withdraws cash from their MoMo account
      // Cash till decreases, MoMo float increases
      cashTillAffected = -(transactionAmount - feeAmount) // We pay out amount minus our fee
      floatAffected = transactionAmount - feeAmount // We receive the amount minus our fee
    }

    // Create MoMo transaction
    const transactionResult = await sql`
      INSERT INTO momo_transactions (
        transaction_reference,
        type,
        phone_number,
        customer_name,
        amount,
        fee,
        provider,
        float_account_id,
        branch_id,
        processed_by,
        user_id,
        cash_till_affected,
        float_affected
      ) VALUES (
        ${transactionReference},
        ${type},
        ${phone_number},
        ${customer_name},
        ${transactionAmount},
        ${feeAmount},
        ${provider},
        ${float_account_id},
        ${branch_id},
        ${processed_by},
        ${user_id},
        ${cashTillAffected},
        ${floatAffected}
      )
      RETURNING *
    `

    // Update MoMo float account balance
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = current_balance + ${floatAffected},
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ${float_account_id}
    `

    // Update cash-in-till balance
    const cashTillAccount = await sql`
      SELECT id FROM float_accounts 
      WHERE branch_id = ${branch_id} AND account_type = 'cash-in-till' AND is_active = true
      LIMIT 1
    `

    if (cashTillAccount.length > 0) {
      await sql`
        UPDATE float_accounts 
        SET 
          current_balance = current_balance + ${cashTillAffected},
          last_updated = CURRENT_TIMESTAMP
        WHERE id = ${cashTillAccount[0].id}
      `
    }

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
        ${float_account_id},
        ${type},
        ${floatAffected},
        ${currentBalance},
        ${currentBalance + floatAffected},
        'MoMo ${type} for ${phone_number}',
        ${transactionResult[0].id},
        ${processed_by},
        ${branch_id},
        ${user_id}
      )
    `

    const transaction = transactionResult[0]

    // Post to General Ledger
    try {
      const glResult = await GLPostingService.createMoMoGLEntries({
        transactionId: transaction.id,
        type: type as "cash-in" | "cash-out",
        amount: transactionAmount,
        fee: feeAmount,
        provider,
        phoneNumber: phone_number,
        customerName: customer_name,
        reference: transactionReference,
        processedBy: user_id,
        branchId: branch_id,
        branchName: branchName || "Unknown Branch",
      })

      if (glResult.success) {
        console.log("✅ [MOMO] GL entries created successfully")
      } else {
        console.error("❌ [MOMO] GL posting failed:", glResult.error)
      }
    } catch (glError) {
      console.error("❌ [MOMO] GL posting error:", glError)
    }

    // Audit log
    await AuditLoggerService.log({
      userId: user_id,
      username: username || "Unknown User",
      actionType: "momo_transaction_completed",
      entityType: "momo_transaction",
      entityId: transaction.id,
      description: `MoMo ${type} transaction completed for ${customer_name}`,
      details: {
        type,
        amount: transactionAmount,
        fee: feeAmount,
        provider,
        phoneNumber: phone_number,
        customerName: customer_name,
        cashTillAffected,
        floatAffected,
      },
      severity: "medium",
      branchId: branch_id,
      branchName: branchName || "Unknown Branch",
      status: "success",
    })

    console.log("✅ [MOMO] Transaction processed successfully:", transaction.id)

    return NextResponse.json({
      success: true,
      message: "MoMo transaction processed successfully",
      transaction: {
        id: transaction.id,
        reference: transaction.transaction_reference,
        type: transaction.type,
        phoneNumber: transaction.phone_number,
        customerName: transaction.customer_name,
        amount: Number(transaction.amount),
        fee: Number(transaction.fee),
        provider: transaction.provider,
        status: transaction.status,
        cashTillAffected: Number(transaction.cash_till_affected),
        floatAffected: Number(transaction.float_affected),
        date: transaction.created_at,
      },
    })
  } catch (error: any) {
    console.error("❌ [MOMO] Error processing transaction:", error)
    return NextResponse.json(
      {
        success: false,
        message: "MoMo transaction failed",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
