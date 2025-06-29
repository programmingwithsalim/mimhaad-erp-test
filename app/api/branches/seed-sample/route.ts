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
        address: "123 Independence Avenue, Accra",
        phone: "+233 30 123 4567",
        email: "accra.main@company.com",
        manager: "John Mensah",
        region: "Greater Accra",
        status: "active",
        staff_count: 15,
      },
      {
        name: "Kumasi Branch",
        code: "KUM001",
        address: "45 Prempeh II Street, Kumasi",
        phone: "+233 32 234 5678",
        email: "kumasi@company.com",
        manager: "Mary Asante",
        region: "Ashanti",
        status: "active",
        staff_count: 12,
      },
      {
        name: "Takoradi Branch",
        code: "TAK001",
        address: "78 Market Circle, Takoradi",
        phone: "+233 31 345 6789",
        email: "takoradi@company.com",
        manager: "Peter Adjei",
        region: "Western",
        status: "active",
        staff_count: 8,
      },
      {
        name: "Tamale Branch",
        code: "TAM001",
        address: "12 Central Market, Tamale",
        phone: "+233 37 456 7890",
        email: "tamale@company.com",
        manager: "Fatima Mohammed",
        region: "Northern",
        status: "active",
        staff_count: 10,
      },
      {
        name: "Cape Coast Branch",
        code: "CAP001",
        address: "34 Commercial Street, Cape Coast",
        phone: "+233 33 567 8901",
        email: "capecoast@company.com",
        manager: "Samuel Agyei",
        region: "Central",
        status: "active",
        staff_count: 6,
      },
    ]

    // Check if branches already exist
    const existingBranches = await sql`SELECT COUNT(*) as count FROM branches`
    const branchCount = Number.parseInt(existingBranches[0].count)

    if (branchCount > 0) {
      return NextResponse.json({
        message: "Sample data already exists",
        existingBranches: branchCount,
      })
    }

    // Insert sample branches
    for (const branch of sampleBranches) {
      await sql`
        INSERT INTO branches (
          name, code, address, phone, email, manager, region, status, staff_count, created_at, updated_at
        ) VALUES (
          ${branch.name}, ${branch.code}, ${branch.address}, ${branch.phone}, 
          ${branch.email}, ${branch.manager}, ${branch.region}, ${branch.status}, 
          ${branch.staff_count}, NOW(), NOW()
        )
      `
    }

    return NextResponse.json({
      message: "Sample branch data created successfully",
      branchesCreated: sampleBranches.length,
      totalStaff: sampleBranches.reduce((sum, branch) => sum + branch.staff_count, 0),
      uniqueManagers: new Set(sampleBranches.map((b) => b.manager)).size,
    })
  } catch (error) {
    console.error("Error seeding sample data:", error)
    return NextResponse.json({ error: "Failed to create sample data" }, { status: 500 })
  }
}
