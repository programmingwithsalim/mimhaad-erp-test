import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { approver_id, comments } = body

    console.log("Approving expense:", id, "by:", approver_id)

    // Update the expense status using correct column name
    const result = await sql`
      UPDATE expenses 
      SET 
        status = 'approved',
        approved_by = ${approver_id},
        approved_at = CURRENT_TIMESTAMP,
        comments = ${comments || ""}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    console.log("Expense approved successfully:", id)

    return NextResponse.json({
      success: true,
      message: "Expense approved successfully",
      expense: result[0],
    })
  } catch (error) {
    console.error("Error approving expense:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to approve expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
