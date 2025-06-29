import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "@/lib/auth-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = getCurrentUser(request as any)
    const { id } = params
    const body = await request.json()

    const { meter_number, provider, amount, customer_name, customer_phone, status } = body

    // Update the transaction
    const result = await sql`
      UPDATE power_transactions 
      SET 
        meter_number = ${meter_number},
        provider = ${provider},
        amount = ${amount},
        customer_name = ${customer_name || null},
        customer_phone = ${customer_phone || null},
        status = ${status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND branch_id = ${currentUser.branchId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Transaction not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      transaction: result[0],
      message: "Transaction updated successfully",
    })
  } catch (error) {
    console.error("Error updating power transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = getCurrentUser(request as any)
    const { id } = params

    // Delete the transaction
    const result = await sql`
      DELETE FROM power_transactions 
      WHERE id = ${id} AND branch_id = ${currentUser.branchId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Transaction not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting power transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
