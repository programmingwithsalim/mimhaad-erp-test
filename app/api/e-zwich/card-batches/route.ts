import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch ID is required",
        },
        { status: 400 },
      )
    }

    const batches = await sql`
      SELECT 
        id,
        batch_number,
        total_cards,
        issued_cards,
        remaining_cards,
        start_card_number,
        end_card_number,
        status,
        created_at
      FROM e_zwich_card_batches 
      WHERE branch_id = ${branchId} AND status = 'active'
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      batches,
    })
  } catch (error: any) {
    console.error("❌ Error fetching card batches:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { batch_number, total_cards, start_card_number, end_card_number, branch_id, user_id } = await request.json()

    if (!batch_number || !total_cards || !start_card_number || !end_card_number || !branch_id || !user_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    const batch = await sql`
      INSERT INTO e_zwich_card_batches (
        batch_number,
        total_cards,
        start_card_number,
        end_card_number,
        branch_id
      ) VALUES (
        ${batch_number},
        ${total_cards},
        ${start_card_number},
        ${end_card_number},
        ${branch_id}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      batch: batch[0],
    })
  } catch (error: any) {
    console.error("❌ Error creating card batch:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
