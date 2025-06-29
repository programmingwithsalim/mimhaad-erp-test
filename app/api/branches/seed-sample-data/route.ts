import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Sample branch data with realistic staff and manager information
    const sampleBranches = [
      {
        name: "Accra Main Branch",
        code: "ACC001",
        location: "Accra Central",
        region: "Greater Accra",
        manager: "John Mensah",
        contact_phone: "+233244123456",
        email: "accra.main@company.com",
        staff_count: 15,
        status: "active",
        address: "123 Independence Avenue, Accra",
      },
      {
        name: "Kumasi Branch",
        code: "KUM001",
        location: "Kumasi Central",
        region: "Ashanti",
        manager: "Mary Asante",
        contact_phone: "+233244234567",
        email: "kumasi@company.com",
        staff_count: 12,
        status: "active",
        address: "45 Prempeh II Street, Kumasi",
      },
      {
        name: "Takoradi Branch",
        code: "TAK001",
        location: "Takoradi Market Circle",
        region: "Western",
        manager: "Peter Adjei",
        contact_phone: "+233244345678",
        email: "takoradi@company.com",
        staff_count: 8,
        status: "active",
        address: "67 Market Circle, Takoradi",
      },
      {
        name: "Tamale Branch",
        code: "TAM001",
        location: "Tamale Central",
        region: "Northern",
        manager: "Fatima Mohammed",
        contact_phone: "+233244456789",
        email: "tamale@company.com",
        staff_count: 10,
        status: "active",
        address: "89 Central Market, Tamale",
      },
      {
        name: "Cape Coast Branch",
        code: "CAP001",
        location: "Cape Coast Castle Area",
        region: "Central",
        manager: "Samuel Agyei",
        contact_phone: "+233244567890",
        email: "capecoast@company.com",
        staff_count: 6,
        status: "active",
        address: "12 Castle Road, Cape Coast",
      },
    ]

    // Check if branches already exist
    const existingBranches = await sql`
      SELECT code FROM branches WHERE code = ANY(${sampleBranches.map((b) => b.code)})
    `

    if (existingBranches.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Sample branches already exist",
        existingCodes: existingBranches.map((b) => b.code),
      })
    }

    // Insert sample branches
    const insertedBranches = []
    for (const branch of sampleBranches) {
      const result = await sql`
        INSERT INTO branches (
          name, code, location, region, manager, contact_phone, 
          email, staff_count, status, address
        ) VALUES (
          ${branch.name}, ${branch.code}, ${branch.location}, ${branch.region},
          ${branch.manager}, ${branch.contact_phone}, ${branch.email}, 
          ${branch.staff_count}, ${branch.status}, ${branch.address}
        )
        RETURNING *
      `
      insertedBranches.push(result[0])
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${insertedBranches.length} sample branches`,
      data: insertedBranches,
    })
  } catch (error) {
    console.error("Error seeding sample branch data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to seed sample data",
      },
      { status: 500 },
    )
  }
}
