import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const account = await sql`
      SELECT * FROM float_accounts 
      WHERE id = ${id}
    `

    if (account.length === 0) {
      return NextResponse.json({ success: false, error: "Float account not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      account: account[0],
    })
  } catch (error) {
    console.error("Error fetching float account:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch float account" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      branch_id,
      provider,
      account_number,
      current_balance,
      min_threshold,
      max_threshold,
      is_active,
      isEzwichPartner,
    } = body

    // Update the float account
    const result = await sql`
      UPDATE float_accounts SET
        branch_id = COALESCE(${branch_id}, branch_id),
        provider = COALESCE(${provider}, provider),
        account_number = COALESCE(${account_number}, account_number),
        current_balance = COALESCE(${current_balance}, current_balance),
        min_threshold = COALESCE(${min_threshold}, min_threshold),
        max_threshold = COALESCE(${max_threshold}, max_threshold),
        is_active = COALESCE(${is_active}, is_active),
        isezwichpartner = COALESCE(${isEzwichPartner}, isezwichpartner),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Float account not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "Float account updated successfully",
    })
  } catch (error) {
    console.error("Error updating float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update float account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    const {
      branch_id,
      provider,
      account_number,
      current_balance,
      min_threshold,
      max_threshold,
      is_active,
      isEzwichPartner,
    } = body

    // Update the float account
    const result = await sql`
      UPDATE float_accounts SET
        branch_id = COALESCE(${branch_id}, branch_id),
        provider = COALESCE(${provider}, provider),
        account_number = COALESCE(${account_number}, account_number),
        current_balance = COALESCE(${current_balance}, current_balance),
        min_threshold = COALESCE(${min_threshold}, min_threshold),
        max_threshold = COALESCE(${max_threshold}, max_threshold),
        is_active = COALESCE(${is_active}, is_active),
        isezwichpartner = COALESCE(${isEzwichPartner}, isezwichpartner),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Float account not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "Float account updated successfully",
    })
  } catch (error) {
    console.error("Error updating float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update float account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const result = await sql`
      DELETE FROM float_accounts 
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Float account not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Float account deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting float account:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete float account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
