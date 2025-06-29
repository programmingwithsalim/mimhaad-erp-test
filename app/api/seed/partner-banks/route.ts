import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Default partner banks to seed
const DEFAULT_PARTNER_BANKS = [
  {
    code: "GCB",
    name: "Ghana Commercial Bank",
    transferFee: 0.01,
    minFee: 5,
    maxFee: 50,
  },
  {
    code: "ECO",
    name: "Ecobank Ghana",
    transferFee: 0.015,
    minFee: 5,
    maxFee: 75,
  },
  {
    code: "STB",
    name: "Stanbic Bank",
    transferFee: 0.0125,
    minFee: 5,
    maxFee: 60,
  },
  {
    code: "CAL",
    name: "Cal Bank",
    transferFee: 0.01,
    minFee: 5,
    maxFee: 50,
  },
  {
    code: "ZEN",
    name: "Zenith Bank",
    transferFee: 0.0125,
    minFee: 5,
    maxFee: 60,
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const branchId = body.branchId

    if (!branchId) {
      return NextResponse.json({ success: false, message: "Branch ID is required" }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if branch exists
    const branchCheck = await sql`
      SELECT id FROM branches WHERE id = ${branchId}
    `

    if (branchCheck.length === 0) {
      return NextResponse.json({ success: false, message: "Branch not found" }, { status: 404 })
    }

    // Check if partner banks already exist for this branch
    const existingBanks = await sql`
      SELECT provider FROM float_accounts 
      WHERE branch_id = ${branchId} 
      AND account_type = 'agency-banking'
      AND provider IS NOT NULL
      AND provider != 'agency'
      AND is_active = true
    `

    if (existingBanks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Partner banks already exist for this branch",
          existingBanks: existingBanks.map((bank) => bank.provider),
        },
        { status: 409 },
      )
    }

    // Create partner bank float accounts
    const createdBanks = []

    for (const bank of DEFAULT_PARTNER_BANKS) {
      // Create metadata with fee information
      const metadata = JSON.stringify({
        transferFee: bank.transferFee,
        minFee: bank.minFee,
        maxFee: bank.maxFee,
      })

      // Insert the bank float account
      const result = await sql`
        INSERT INTO float_accounts (
          branch_id,
          account_type,
          provider,
          account_number,
          current_balance,
          min_threshold,
          max_threshold,
          metadata,
          created_by
        ) VALUES (
          ${branchId},
          'agency-banking',
          ${bank.code},
          NULL,
          10000,
          5000,
          200000,
          ${metadata}::jsonb,
          'system'
        )
        RETURNING id, provider
      `

      if (result.length > 0) {
        createdBanks.push({
          id: result[0].id,
          code: result[0].provider,
          name: bank.name,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdBanks.length} partner banks`,
      banks: createdBanks,
    })
  } catch (error) {
    console.error("Error seeding partner banks:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to seed partner banks: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
