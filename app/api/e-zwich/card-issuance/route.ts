import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { GLPostingService } from "@/lib/services/gl-posting-service-universal"
import { auditLogger } from "@/lib/services/audit-logger-service"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔄 [E-ZWICH] Processing card issuance:", body)

    const {
      cardNumber,
      partnerBank,
      customerName,
      phoneNumber,
      email,
      dateOfBirth,
      gender,
      addressLine1,
      addressLine2,
      city,
      region,
      postalCode,
      idType,
      idNumber,
      idExpiryDate,
      fee,
      paymentMethod,
      reference,
      customerPhoto,
      idPhoto,
      user_id,
      branch_id,
      processed_by,
    } = body

    // Validate required fields
    const requiredFields = {
      cardNumber: !!cardNumber,
      partnerBank: !!partnerBank,
      customerName: !!customerName,
      phoneNumber: !!phoneNumber,
      dateOfBirth: !!dateOfBirth,
      gender: !!gender,
      addressLine1: !!addressLine1,
      city: !!city,
      region: !!region,
      idType: !!idType,
      idNumber: !!idNumber,
      fee: fee !== undefined && fee >= 0,
      paymentMethod: !!paymentMethod,
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

    // Validate age (must be at least 18 years old)
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 18) {
      return NextResponse.json(
        {
          success: false,
          error: "Age validation failed",
          details: "Customer must be at least 18 years old",
        },
        { status: 400 },
      )
    }

    // Check if card number already exists
    const existingCard = await sql`
      SELECT id FROM e_zwich_card_issuances 
      WHERE card_number = ${cardNumber}
    `

    if (existingCard.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Card number already exists",
          details: `Card number ${cardNumber} has already been issued`,
        },
        { status: 400 },
      )
    }

    // Find available card batch for this branch
    const availableBatch = await sql`
      SELECT id, batch_code, quantity_available 
      FROM ezwich_card_batches 
      WHERE branch_id = ${branch_id} 
      AND quantity_available > 0 
      AND status = 'received'
      ORDER BY created_at ASC
      LIMIT 1
    `

    if (availableBatch.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No card inventory available",
          details: "No card batches with available cards found for this branch",
        },
        { status: 400 },
      )
    }

    const batch = availableBatch[0]
    const finalReference = reference || `CARD-${cardNumber}-${Date.now()}`

    // Get user details if user_id is provided and is a valid UUID
    let actualUserId = null
    let issuedBy = processed_by

    if (user_id) {
      // Check if user_id is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user_id)) {
        actualUserId = user_id
        // Get user details for issued_by field
        const userDetails = await sql`
          SELECT id, email FROM users WHERE id = ${user_id}
        `
        if (userDetails.length > 0) {
          issuedBy = userDetails[0].email || processed_by
        }
      } else {
        // If user_id is not a UUID (like an email), use it as processed_by
        issuedBy = user_id
      }
    }

    // Start transaction
    try {
      // Insert card issuance record using fee_charged column
      const issuanceResult = await sql`
        INSERT INTO e_zwich_card_issuances (
          card_number, partner_bank, customer_name, customer_phone, customer_email,
          date_of_birth, gender, address_line1, address_line2, city, region,
          postal_code, id_type, id_number, id_expiry_date, fee_charged, payment_method,
          reference, customer_photo, id_photo, status, issued_by, branch_id,
          created_at
        ) VALUES (
          ${cardNumber}, ${partnerBank}, ${customerName}, ${phoneNumber},
          ${email || null}, ${dateOfBirth}, ${gender}, ${addressLine1}, ${addressLine2 || null},
          ${city}, ${region}, ${postalCode || null}, ${idType}, ${idNumber}, 
          ${idExpiryDate || null}, ${fee}, ${paymentMethod}, ${finalReference},
          ${customerPhoto || null}, ${idPhoto || null}, 'completed', ${issuedBy},
          ${branch_id}, CURRENT_TIMESTAMP
        )
        RETURNING *
      `

      const issuance = issuanceResult[0]

      // Update card batch inventory - handle the constraint properly
      const currentQuantity = Number(batch.quantity_available)
      const newQuantityAvailable = Math.max(0, currentQuantity - 1)
      const newQuantityIssued = Number(batch.quantity_issued || 0) + 1

      await sql`
        UPDATE ezwich_card_batches 
        SET quantity_available = ${newQuantityAvailable},
            quantity_issued = ${newQuantityIssued},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${batch.id}
      `

      console.log(`✅ [E-ZWICH] Updated batch ${batch.batch_code}: ${newQuantityAvailable} cards remaining`)

      // Create GL entries for card issuance
      try {
        const glResult = await GLPostingService.createEZwichGLEntries({
          transactionId: issuance.id,
          type: "card_issuance",
          amount: Number(fee),
          fee: 0, // Fee is the main amount for card issuance
          provider: partnerBank,
          cardNumber: cardNumber,
          customerName: customerName,
          reference: finalReference,
          processedBy: issuedBy,
          branchId: branch_id,
          branchName: "Unknown Branch",
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
      if (actualUserId) {
        await auditLogger.log({
          action: "ezwich_card_issuance",
          entity_type: "ezwich_card_issuance",
          entity_id: issuance.id,
          user_id: actualUserId,
          branch_id: branch_id,
          details: {
            card_number: cardNumber,
            customer_name: customerName,
            partner_bank: partnerBank,
            fee: Number(fee),
            payment_method: paymentMethod,
            batch_code: batch.batch_code,
          },
          severity: "low",
        })
      }

      console.log("✅ [E-ZWICH] Card issuance processed successfully:", issuance.id)

      return NextResponse.json({
        success: true,
        issuance: issuance,
        batch_info: {
          batch_code: batch.batch_code,
          remaining_cards: newQuantityAvailable,
        },
        message: "E-Zwich card issued successfully",
      })
    } catch (error) {
      console.error("❌ [E-ZWICH] Transaction failed:", error)
      throw error
    }
  } catch (error) {
    console.error("❌ [E-ZWICH] Card issuance error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to issue E-Zwich card",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
