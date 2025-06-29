import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Adding isEzwichPartner column to float_accounts table...")

    // Check if column exists
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'float_accounts' 
        AND column_name = 'isezwichpartner'
      ) as exists
    `

    if (!columnExists[0].exists) {
      // Add the column
      await sql`
        ALTER TABLE float_accounts 
        ADD COLUMN isEzwichPartner BOOLEAN DEFAULT false
      `

      // Create index for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_float_accounts_isezwichpartner 
        ON float_accounts(isEzwichPartner)
      `

      // Update existing e-zwich accounts to be non-partner by default
      await sql`
        UPDATE float_accounts 
        SET isEzwichPartner = false 
        WHERE account_type = 'e-zwich' 
        AND isEzwichPartner IS NULL
      `

      console.log("Successfully added isEzwichPartner column")
    } else {
      console.log("isEzwichPartner column already exists")
    }

    return NextResponse.json({
      success: true,
      message: "isEzwichPartner column added successfully",
    })
  } catch (error) {
    console.error("Error adding isEzwichPartner column:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add isEzwichPartner column",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
