import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Adding branch fields to commissions table...")

    // Add branch_id and branch_name columns
    await sql`
      ALTER TABLE commissions 
      ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)
    `

    // Create index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id)
    `

    // Update existing commissions to have a default branch
    const updateResult = await sql`
      UPDATE commissions 
      SET branch_id = 'main-branch', 
          branch_name = 'Main Branch' 
      WHERE branch_id IS NULL
    `

    console.log("Branch fields added successfully")
    console.log("Updated existing commissions:", updateResult.count)

    return NextResponse.json({
      success: true,
      message: "Branch fields added to commissions table successfully",
      updatedRows: updateResult.count,
    })
  } catch (error) {
    console.error("Error adding branch fields to commissions:", error)
    return NextResponse.json(
      {
        error: "Failed to add branch fields to commissions table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
