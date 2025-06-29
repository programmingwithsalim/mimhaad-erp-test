import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { differenceInYears, parseISO } from "date-fns"

const sql = neon(process.env.DATABASE_URL!)

// Validation functions
function validateAge(dateOfBirth: string): boolean {
  try {
    const birthDate = parseISO(dateOfBirth)
    const age = differenceInYears(new Date(), birthDate)
    return age >= 18
  } catch {
    return false
  }
}

function validateIdNumber(idType: string, idNumber: string): boolean {
  switch (idType) {
    case "ghana_card":
      return /^GHA-\d{9}-\d$/.test(idNumber)
    case "voters_id":
      return /^\d+$/.test(idNumber)
    case "drivers_license":
      return /^[A-Z]{3}-\d{8}-\d{5}$/.test(idNumber)
    case "passport":
      return /^\d{8}$/.test(idNumber)
    default:
      return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("🎫 [E-ZWICH] Card issuance request:", body)

    const {
      card_number,
      customer_name,
      customer_phone,
      customer_email,
      date_of_birth,
      gender,
      address_line1,
      address_line2,
      city,
      region,
      postal_code,
      id_type,
      id_number,
      id_expiry_date,
      fee_charged,
      payment_method,
      customer_photo,
      id_document,
      reference,
      user_id,
      branch_id,
    } = body

    // Validate required fields
    if (
      !card_number ||
      !customer_name ||
      !customer_phone ||
      !date_of_birth ||
      !gender ||
      !address_line1 ||
      !city ||
      !region ||
      !id_type ||
      !id_number ||
      !id_expiry_date ||
      !customer_photo ||
      !id_document
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields. Customer photo and ID document are required.",
        },
        { status: 400 },
      )
    }

    // Validate age (18+)
    if (!validateAge(date_of_birth)) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer must be at least 18 years old",
        },
        { status: 400 },
      )
    }

    // Validate ID number format
    if (!validateIdNumber(id_type, id_number)) {
      let formatMessage = ""
      switch (id_type) {
        case "ghana_card":
          formatMessage = "Ghana Card must be in format: GHA-000000000-0"
          break
        case "voters_id":
          formatMessage = "Voter's ID must be numeric only"
          break
        case "drivers_license":
          formatMessage = "Driver's License format: ABC-00000000-00000"
          break
        case "passport":
          formatMessage = "Passport must be 8 digits only"
          break
      }

      return NextResponse.json(
        {
          success: false,
          error: `Invalid ID number format. ${formatMessage}`,
        },
        { status: 400 },
      )
    }

    // Check if card number already exists
    const existingCard = await sql`
      SELECT id FROM e_zwich_card_issuances WHERE card_number = ${card_number}
    `

    if (existingCard.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Card number already exists",
        },
        { status: 400 },
      )
    }

    // Generate transaction ID
    const transactionId = `ezcard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Insert card issuance record
    const cardIssuance = await sql`
      INSERT INTO e_zwich_card_issuances (
        id,
        card_number,
        partner_bank,
        customer_name,
        customer_phone,
        customer_email,
        date_of_birth,
        gender,
        address_line1,
        address_line2,
        city,
        region,
        postal_code,
        id_type,
        id_number,
        id_expiry_date,
        fee_charged,
        payment_method,
        customer_photo,
        id_photo,
        reference,
        user_id,
        branch_id,
        issued_by,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${transactionId},
        ${card_number},
        'E-Zwich Ghana',
        ${customer_name},
        ${customer_phone},
        ${customer_email},
        ${date_of_birth},
        ${gender},
        ${address_line1},
        ${address_line2},
        ${city},
        ${region},
        ${postal_code},
        ${id_type},
        ${id_number},
        ${id_expiry_date},
        ${fee_charged || 15},
        ${payment_method},
        ${customer_photo},
        ${id_document},
        ${reference || transactionId},
        ${user_id},
        ${branch_id},
        ${user_id},
        'completed',
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log("✅ [E-ZWICH] Card issued successfully:", transactionId)

    return NextResponse.json({
      success: true,
      message: "E-Zwich card issued successfully",
      cardIssuance: {
        id: cardIssuance[0].id,
        cardNumber: cardIssuance[0].card_number,
        customerName: cardIssuance[0].customer_name,
        fee: Number(cardIssuance[0].fee_charged),
        reference: cardIssuance[0].reference,
        status: cardIssuance[0].status,
        createdAt: cardIssuance[0].created_at,
      },
    })
  } catch (error: any) {
    console.error("❌ [E-ZWICH] Card issuance error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process card issuance",
      },
      { status: 500 },
    )
  }
}
