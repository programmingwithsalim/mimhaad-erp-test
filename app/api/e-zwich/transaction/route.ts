import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { GLPostingService } from "@/lib/services/gl-posting-service-universal"
import { auditLogger } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔄 [E-ZWICH] Processing transaction:", body)

    const {
      type,
      card_number,
      settlement_account_id,
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
    const requiredFields = {
      type: !!type,
      card_number: !!card_number,
      settlement_account_id: !!settlement_account_id,
      customer_name: !!customer_name,
      customer_phone: !!customer_phone,
      amount: !!amount && amount > 0,
      user_id: !!user_id,
      branch_id: !!branch_id,
      processed_by: !!processed_by,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, isValid]) => !isValid)
      .map(([field]) => field)

    if (missingFields.length > 0) {
      console.error("❌ [E-ZWICH] Missing required fields:", missingFields)
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          details: `${missingFields.join(", ")} are required`,
          missingFields,
        },
        { status: 400 },
      )
    }

    // Get settlement account details
    const settlementAccount = await sql`
      SELECT * FROM float_accounts 
      WHERE id = ${settlement_account_id} AND is_active = true
    `

    if (settlementAccount.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Settlement account not found or inactive",
        },
        { status: 404 },
      )
    }

    const account = settlementAccount[0]

    // Check if settlement account has sufficient balance
    const totalRequired = Number(amount) + Number(fee || 0)
    if (account.current_balance < totalRequired) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient settlement account balance",
          details: `Required: GHS ${totalRequired.toFixed(2)}, Available: GHS ${account.current_balance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Generate UUID for transaction ID
    const transactionIdResult = await sql`SELECT gen_random_uuid() as id`
    const transactionId = transactionIdResult[0].id
    const reference = `EZW-${type.toUpperCase()}-${Date.now()}`

    // Insert transaction record into e_zwich_withdrawals table with all required fields
    const transactionResult = await sql`
      INSERT INTO e_zwich_withdrawals (
        id, card_number, settlement_account_id, customer_name, 
        customer_phone, amount, fee, notes, status, reference,
        transaction_reference, partner_bank, user_id, branch_id, 
        processed_by, created_at
      ) VALUES (
        ${transactionId}, ${card_number}, ${settlement_account_id},
        ${customer_name}, ${customer_phone}, ${amount}, ${fee || 0}, ${note || ""},
        'completed', ${reference}, ${reference}, ${account.provider || "E-Zwich Partner"},
        ${user_id}, ${branch_id}, ${processed_by}, CURRENT_TIMESTAMP
      )
      RETURNING *
    `

    const transaction = transactionResult[0]

    // Update settlement account balance
    await sql`
      UPDATE float_accounts 
      SET current_balance = current_balance - ${totalRequired},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${settlement_account_id}
    `

    // Create GL entries for the transaction
    try {
      const glResult = await GLPostingService.createEZwichGLEntries({
        transactionId: transaction.id,
        type: type as "withdrawal" | "card_issuance",
        amount: Number(amount),
        fee: Number(fee || 0),
        provider: account.provider || "E-Zwich",
        cardNumber: card_number,
        customerName: customer_name,
        reference: reference,
        processedBy: processed_by,
        branchId: branch_id,
        branchName: account.branch_name || "Unknown Branch",
      })

      if (!glResult.success) {
        console.warn("⚠️ [E-ZWICH] GL posting failed:", glResult.error)
      } else {
        console.log("✅ [E-ZWICH] GL entries created successfully")
      }
    } catch (glError) {
      console.error("❌ [E-ZWICH] GL posting error:", glError)
      // Don't fail the transaction if GL posting fails
    }

    // Log audit trail
    await auditLogger.log({
      action: `ezwich_${type}`,
      entity_type: "ezwich_withdrawal",
      entity_id: transaction.id,
      user_id: user_id,
      branch_id: branch_id,
      details: {
        type,
        card_number,
        customer_name,
        amount: Number(amount),
        fee: Number(fee || 0),
        settlement_account: account.provider,
      },
      severity: "low",
    })

    console.log("✅ [E-ZWICH] Transaction processed successfully:", transaction.id)

    return NextResponse.json({
      success: true,
      transaction: {
        ...transaction,
        settlement_account: account,
      },
      message: `E-Zwich ${type} processed successfully`,
    })
  } catch (error) {
    console.error("❌ [E-ZWICH] Transaction error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process E-Zwich transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
