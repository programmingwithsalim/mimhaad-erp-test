import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { AuditLoggerService } from "@/lib/services/audit-logger-service"
import { UniversalGLPostingService } from "@/lib/services/gl-posting-service-universal"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Extract user context
    const userId = formData.get("user_id") as string
    const branchId = formData.get("branch_id") as string
    const processedBy = formData.get("processed_by") as string

    console.log("🎫 [E-ZWICH] Card issuance request:", {
      userId,
      branchId,
      processedBy,
    })

    // Validate user context
    if (!userId || userId === "System" || userId === "system") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid user ID is required for card issuance",
        },
        { status: 400 },
      )
    }

    if (!branchId || branchId === "System" || branchId === "system") {
      return NextResponse.json(
        {
          success: false,
          error: "Valid branch ID is required for card issuance",
        },
        { status: 400 },
      )
    }

    // Extract form data
    const cardNumber = formData.get("card_number") as string
    const customerName = formData.get("customer_name") as string
    const phoneNumber = formData.get("phone_number") as string
    const email = formData.get("email") as string
    const dateOfBirth = formData.get("date_of_birth") as string
    const gender = formData.get("gender") as string
    const idType = formData.get("id_type") as string
    const idNumber = formData.get("id_number") as string
    const idExpiryDate = formData.get("id_expiry_date") as string
    const fee = Number(formData.get("fee")) || 15
    const paymentMethod = formData.get("payment_method") as string
    const reference = formData.get("reference") as string

    // Validate required fields
    if (!cardNumber || !customerName || !phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: card_number, customer_name, phone_number",
        },
        { status: 400 },
      )
    }

    // Generate transaction ID
    const transactionId = `ezw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.log("🎫 [E-ZWICH] Creating card issuance with ID:", transactionId)

    // Log card issuance attempt
    await AuditLoggerService.log({
      userId,
      username: processedBy || "Unknown User",
      actionType: "ezwich_card_issuance_attempt",
      entityType: "ezwich_card_issuance",
      entityId: transactionId,
      description: `Attempting to issue E-Zwich card ${cardNumber} for ${customerName}`,
      details: {
        cardNumber,
        customerName,
        phoneNumber,
        fee,
        paymentMethod,
      },
      severity: "medium",
      branchId,
      branchName: (formData.get("branchName") as string) || "Unknown Branch",
      status: "success",
    })

    // Insert card issuance record
    const insertResult = await sql`
      INSERT INTO e_zwich_card_issuances (
        id,
        card_number,
        customer_name,
        phone_number,
        email,
        date_of_birth,
        gender,
        id_type,
        id_number,
        id_expiry_date,
        fee,
        payment_method,
        reference,
        user_id,
        branch_id,
        processed_by,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${transactionId},
        ${cardNumber},
        ${customerName},
        ${phoneNumber},
        ${email || null},
        ${dateOfBirth},
        ${gender},
        ${idType},
        ${idNumber},
        ${idExpiryDate || null},
        ${fee},
        ${paymentMethod},
        ${reference},
        ${userId},
        ${branchId},
        ${processedBy},
        'completed',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const transaction = insertResult[0]
    console.log("✅ [E-ZWICH] Card issuance completed:", transaction.id)

    // Post to GL
    try {
      await UniversalGLPostingService.postEzwichTransaction({
        id: transaction.id,
        type: "card-issuance",
        cardNumber: transaction.card_number,
        customerName: transaction.customer_name,
        customerPhone: transaction.phone_number,
        fee: Number(transaction.fee),
        reference: transaction.reference,
        userId: transaction.user_id,
        createdAt: transaction.created_at,
      })
      console.log("✅ [E-ZWICH] Transaction posted to GL successfully")
    } catch (glError) {
      console.error("❌ [E-ZWICH] Failed to post to GL:", glError)
      // Don't fail the transaction if GL posting fails
    }

    // Log successful card issuance
    await AuditLoggerService.log({
      userId,
      username: processedBy || "Unknown User",
      actionType: "ezwich_card_issued",
      entityType: "ezwich_card_issuance",
      entityId: transaction.id,
      description: `Successfully issued E-Zwich card ${cardNumber} for ${customerName}`,
      details: {
        transactionId: transaction.id,
        cardNumber,
        customerName,
        phoneNumber,
        fee,
        paymentMethod,
        reference,
      },
      severity: "medium",
      branchId,
      branchName: (formData.get("branchName") as string) || "Unknown Branch",
      status: "success",
    })

    return NextResponse.json({
      success: true,
      message: "E-Zwich card issued successfully",
      transaction: {
        id: transaction.id,
        cardNumber: transaction.card_number,
        customerName: transaction.customer_name,
        fee: Number(transaction.fee),
        reference: transaction.reference,
        status: transaction.status,
        createdAt: transaction.created_at,
      },
    })
  } catch (error: any) {
    console.error("❌ [E-ZWICH] Error processing card issuance:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process card issuance",
      },
      { status: 500 },
    )
  }
}
