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
    const status = searchParams.get("status")
    const limit = searchParams.get("limit") || "50"

    console.log("Fetching E-Zwich withdrawals for branch:", branchId)

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS e_zwich_withdrawals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20),
          amount DECIMAL(10,2) NOT NULL,
          fee DECIMAL(10,2) DEFAULT 0,
          partner_bank VARCHAR(255),
          status VARCHAR(20) DEFAULT 'completed',
          reference VARCHAR(100),
          transaction_reference VARCHAR(100),
          transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          branch_id VARCHAR(255) NOT NULL,
          processed_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating e_zwich_withdrawals table:", tableError)
    }

    let withdrawals = []

    try {
      let query = sql`
        SELECT 
          id,
          card_number,
          customer_name,
          customer_phone,
          amount,
          fee,
          partner_bank,
          status,
          reference,
          transaction_reference,
          transaction_date,
          branch_id,
          processed_by,
          created_at
        FROM e_zwich_withdrawals 
        WHERE branch_id = ${branchId}
      `

      if (status) {
        query = sql`
          SELECT 
            id,
            card_number,
            customer_name,
            customer_phone,
            amount,
            fee,
            partner_bank,
            status,
            reference,
            transaction_reference,
            transaction_date,
            branch_id,
            processed_by,
            created_at
          FROM e_zwich_withdrawals 
          WHERE branch_id = ${branchId} AND status = ${status}
        `
      }

      query = sql`${query} ORDER BY created_at DESC LIMIT ${Number.parseInt(limit)}`

      withdrawals = await query
    } catch (queryError) {
      console.error("Error querying e_zwich_withdrawals:", queryError)
      withdrawals = []
    }

    console.log(`Found ${withdrawals.length} E-Zwich withdrawals`)

    return NextResponse.json({
      success: true,
      withdrawals,
    })
  } catch (error) {
    console.error("Error fetching E-Zwich withdrawals:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch E-Zwich withdrawals",
        withdrawals: [],
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
    const { card_number, customer_name, customer_phone, amount, fee, partner_bank } = body

    // Validate required fields
    if (!card_number || !customer_name || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { user } = session

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS e_zwich_withdrawals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_number VARCHAR(20) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(20),
          amount DECIMAL(10,2) NOT NULL,
          fee DECIMAL(10,2) DEFAULT 0,
          partner_bank VARCHAR(255),
          status VARCHAR(20) DEFAULT 'completed',
          reference VARCHAR(100),
          transaction_reference VARCHAR(100),
          transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          branch_id VARCHAR(255) NOT NULL,
          processed_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (tableError) {
      console.error("Error creating e_zwich_withdrawals table:", tableError)
    }

    // Insert withdrawal
    const result = await sql`
      INSERT INTO e_zwich_withdrawals (
        card_number, customer_name, customer_phone, amount, fee,
        partner_bank, status, reference, transaction_reference,
        branch_id, processed_by
      ) VALUES (
        ${card_number},
        ${customer_name},
        ${customer_phone || ""},
        ${amount},
        ${fee || 0},
        ${partner_bank || "E-Zwich"},
        'completed',
        ${`EZW-${Date.now()}`},
        ${`TXN-${Date.now()}`},
        ${user.branchId},
        ${user.id}
      ) RETURNING *
    `

    const withdrawal = result[0]

    return NextResponse.json({
      success: true,
      withdrawal,
      message: "E-Zwich withdrawal created successfully",
    })
  } catch (error) {
    console.error("Error creating E-Zwich withdrawal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
