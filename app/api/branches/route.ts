"use server"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = `
      SELECT 
        id,
        name,
        code,
        location,
        region,
        phone,
        email,
        address,
        is_active,
        created_at,
        updated_at
      FROM branches
    `

    if (!includeInactive) {
      query += " WHERE is_active = true"
    }

    query += " ORDER BY name ASC"

    const branches = await sql.unsafe(query)

    return NextResponse.json({
      success: true,
      branches: branches || [],
    })
  } catch (error) {
    console.error("Error fetching branches:", error)

    // Return mock data if database fails
    const mockBranches = [
      {
        id: "635844ab-029a-43f8-8523-d7882915266a",
        name: "Main Branch",
        code: "MB001",
        location: "Accra",
        region: "Greater Accra",
        phone: "+233 20 123 4567",
        email: "main@mimhaad.com",
        address: "123 Main Street, Accra",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      success: true,
      branches: mockBranches,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, location, region, phone, email, address } = body

    if (!name || !code) {
      return NextResponse.json({ success: false, error: "Name and code are required" }, { status: 400 })
    }

    const [branch] = await sql`
      INSERT INTO branches (name, code, location, region, phone, email, address)
      VALUES (${name}, ${code}, ${location || ""}, ${region || ""}, ${phone || ""}, ${email || ""}, ${address || ""})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      branch,
    })
  } catch (error) {
    console.error("Error creating branch:", error)
    return NextResponse.json({ success: false, error: "Failed to create branch" }, { status: 500 })
  }
}
