import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth-service"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId") || session.user.branchId
    const limit = searchParams.get("limit") || "50"

    console.log("Fetching E-Zwich card issuances for branch:", branchId)

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS e_zwich_card_issuances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20),
          fee_charged DECIMAL(10,2) DEFAULT 0,
          partner_bank VARCHAR(255),
          status VARCHAR(20) DEFAULT 'completed',
          reference VARCHAR(100),
          payment_method VARCHAR(50) DEFAULT 'cash',
          branch_id VARCHAR(255) NOT NULL,
          issued_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating e_zwich_card_issuances table:", tableError)
    }

    let issuances = []

    try {
      issuances = await sql`
        SELECT 
          id,
          card_number,
          customer_name,
          customer_phone,
          fee_charged,
          partner_bank,
          status,
          reference,
          payment_method,
          branch_id,
          issued_by,
          created_at
        FROM e_zwich_card_issuances 
        WHERE branch_id = ${branchId}
        ORDER BY created_at DESC 
        LIMIT ${Number.parseInt(limit)}
      `
    } catch (queryError) {
      console.error("Error querying e_zwich_card_issuances:", queryError)
      issuances = []
    }

    console.log(`Found ${issuances.length} E-Zwich card issuances`)

    return NextResponse.json({
      success: true,
      data: issuances,
    })
  } catch (error) {
    console.error("Error fetching E-Zwich card issuances:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch E-Zwich card issuances",
        data: [],
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { card_number, customer_name, customer_phone, fee_charged, partner_bank, payment_method } = body

    // Validate required fields
    if (!card_number || !customer_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { user } = session

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS e_zwich_card_issuances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20),
          fee_charged DECIMAL(10,2) DEFAULT 0,
          partner_bank VARCHAR(255),
          status VARCHAR(20) DEFAULT 'completed',
          reference VARCHAR(100),
          payment_method VARCHAR(50) DEFAULT 'cash',
          branch_id VARCHAR(255) NOT NULL,
          issued_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating e_zwich_card_issuances table:", tableError)
    }

    // Insert card issuance
    const result = await sql`
      INSERT INTO e_zwich_card_issuances (
        card_number, customer_name, customer_phone, fee_charged,
        partner_bank, status, reference, payment_method,
        branch_id, issued_by
      ) VALUES (
        ${card_number},
        ${customer_name},
        ${customer_phone || ""},
        ${fee_charged || 0},
        ${partner_bank || "E-Zwich"},
        'completed',
        ${`CARD-${Date.now()}`},
        ${payment_method || "cash"},
        ${user.branchId},
        ${user.id}
      ) RETURNING *
    `

    const issuance = result[0]

    return NextResponse.json({
      success: true,
      issuance,
      message: "E-Zwich card issuance created successfully",
    })
  } catch (error) {
    console.error("Error creating E-Zwich card issuance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
