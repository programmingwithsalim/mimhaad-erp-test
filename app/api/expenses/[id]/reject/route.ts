import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: Promise<{ id: string  }> }) {
  try {
    const { id } = params
    const body = await request.json()
    const { approver_id, reason } = body

    console.log("Rejecting expense:", id, "by:", approver_id)

    // Update the expense status
    const result = await sql`
      UPDATE expenses 
      SET 
        status = 'rejected',
        approved_by = ${approver_id},
        approved_at = CURRENT_TIMESTAMP,
        approval_comments = ${reason || ""}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 })
    }

    console.log("Expense rejected successfully:", id)

    return NextResponse.json({
      success: true,
      message: "Expense rejected successfully",
      expense: result[0],
    })
  } catch (error) {
    console.error("Error rejecting expense:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reject expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
