import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const issuanceId = params.id

    // Check if issuance exists
    const existing = await sql`
      SELECT * FROM e_zwich_card_issuances WHERE id = ${issuanceId}
    `

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Card issuance not found" }, { status: 404 })
    }

    // Delete the issuance
    await sql`
      DELETE FROM e_zwich_card_issuances WHERE id = ${issuanceId}
    `

    // Update card batch inventory (add back the card)
    const issuance = existing[0]
    await sql`
      UPDATE ezwich_card_batches 
      SET quantity_available = quantity_available + 1,
          quantity_issued = quantity_issued - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE branch_id = ${issuance.branch_id}
      AND quantity_issued > 0
      ORDER BY created_at DESC
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      message: "E-Zwich card issuance deleted successfully",
    })
  } catch (error) {
    console.error("❌ Error deleting E-Zwich card issuance:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete E-Zwich card issuance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const issuanceId = params.id
    const body = await request.json()

    // Update the issuance
    const updated = await sql`
      UPDATE e_zwich_card_issuances 
      SET 
        customer_name = ${body.customer_name},
        phone_number = ${body.phone_number},
        email = ${body.email},
        fee = ${body.fee},
        status = ${body.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${issuanceId}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "Card issuance not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "E-Zwich card issuance updated successfully",
    })
  } catch (error) {
    console.error("❌ Error updating E-Zwich card issuance:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update E-Zwich card issuance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
