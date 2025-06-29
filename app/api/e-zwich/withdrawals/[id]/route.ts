import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const withdrawalId = params.id

    // Check if withdrawal exists
    const existing = await sql`
      SELECT * FROM e_zwich_withdrawals WHERE id = ${withdrawalId}
    `

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Withdrawal not found" }, { status: 404 })
    }

    // Delete the withdrawal
    await sql`
      DELETE FROM e_zwich_withdrawals WHERE id = ${withdrawalId}
    `

    return NextResponse.json({
      success: true,
      message: "E-Zwich withdrawal deleted successfully",
    })
  } catch (error) {
    console.error("❌ Error deleting E-Zwich withdrawal:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete E-Zwich withdrawal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const withdrawalId = params.id
    const body = await request.json()

    // Update the withdrawal
    const updated = await sql`
      UPDATE e_zwich_withdrawals 
      SET 
        amount = ${body.amount},
        fee = ${body.fee},
        status = ${body.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${withdrawalId}
      RETURNING *
    `

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "Withdrawal not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "E-Zwich withdrawal updated successfully",
    })
  } catch (error) {
    console.error("❌ Error updating E-Zwich withdrawal:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update E-Zwich withdrawal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
