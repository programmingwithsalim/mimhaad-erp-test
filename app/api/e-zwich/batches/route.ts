import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")

    if (!branchId) {
      return NextResponse.json({ success: false, error: "Branch ID is required" }, { status: 400 })
    }

    // Ensure card batches table exists
    await sql`
      CREATE TABLE IF NOT EXISTS ezwich_card_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_code VARCHAR(50) UNIQUE NOT NULL,
        quantity_received INTEGER NOT NULL,
        quantity_issued INTEGER DEFAULT 0,
        quantity_available INTEGER GENERATED ALWAYS AS (quantity_received - quantity_issued) STORED,
        card_type VARCHAR(50) DEFAULT 'Standard',
        expiry_date DATE,
        status VARCHAR(20) DEFAULT 'received',
        branch_id VARCHAR(100) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `

    const batches = await sql`
      SELECT 
        id,
        batch_code,
        quantity_received,
        quantity_issued,
        quantity_available,
        card_type,
        expiry_date,
        status,
        created_by,
        created_at,
        notes
      FROM ezwich_card_batches 
      WHERE branch_id = ${branchId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: batches,
    })
  } catch (error) {
    console.error("Error fetching card batches:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch card batches" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batch_code, quantity_received, card_type, expiry_date, branch_id, created_by, notes } = body

    if (!batch_code || !quantity_received || !branch_id || !created_by) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS ezwich_card_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_code VARCHAR(50) UNIQUE NOT NULL,
        quantity_received INTEGER NOT NULL,
        quantity_issued INTEGER DEFAULT 0,
        quantity_available INTEGER GENERATED ALWAYS AS (quantity_received - quantity_issued) STORED,
        card_type VARCHAR(50) DEFAULT 'Standard',
        expiry_date DATE,
        status VARCHAR(20) DEFAULT 'received',
        branch_id VARCHAR(100) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `

    const result = await sql`
      INSERT INTO ezwich_card_batches (
        batch_code,
        quantity_received,
        card_type,
        expiry_date,
        branch_id,
        created_by,
        notes
      ) VALUES (
        ${batch_code},
        ${quantity_received},
        ${card_type || "Standard"},
        ${expiry_date ? new Date(expiry_date) : null},
        ${branch_id},
        ${created_by},
        ${notes || ""}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result[0],
      message: "Card batch added successfully",
    })
  } catch (error) {
    console.error("Error creating card batch:", error)
    return NextResponse.json({ success: false, error: "Failed to create card batch" }, { status: 500 })
  }
}
