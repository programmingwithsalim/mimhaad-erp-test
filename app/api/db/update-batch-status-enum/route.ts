import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Updating batch status enum...")

    // First, check current enum values
    const currentEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'batch_status'
      )
    `

    console.log(
      "Current enum values:",
      currentEnum.map((e) => e.enumlabel),
    )

    // Add new enum values safely
    const newValues = ["low_stock", "depleted", "expired"]

    for (const value of newValues) {
      try {
        await sql`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = ${value}
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'batch_status')
            ) THEN
              ALTER TYPE batch_status ADD VALUE ${value};
            END IF;
          END $$;
        `
        console.log(`Added enum value: ${value}`)
      } catch (error) {
        console.log(`Enum value ${value} might already exist:`, error)
      }
    }

    // Verify the update
    const updatedEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'batch_status'
      )
      ORDER BY enumlabel
    `

    console.log(
      "Updated enum values:",
      updatedEnum.map((e) => e.enumlabel),
    )

    return NextResponse.json({
      success: true,
      message: "Batch status enum updated successfully",
      currentValues: updatedEnum.map((e) => e.enumlabel),
    })
  } catch (error) {
    console.error("Error updating batch status enum:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update batch status enum",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
