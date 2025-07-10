import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("Adding fee columns to transaction tables...");

    // Add fee column to jumia_transactions if it doesn't exist
    try {
      await sql`
        ALTER TABLE jumia_transactions 
        ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0
      `;
      console.log("✓ Added fee column to jumia_transactions");
    } catch (error) {
      console.log("⚠ Error adding fee to jumia_transactions:", error);
    }

    // Add fee column to power_transactions if it doesn't exist
    try {
      await sql`
        ALTER TABLE power_transactions 
        ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0
      `;
      console.log("✓ Added fee column to power_transactions");
    } catch (error) {
      console.log("⚠ Error adding fee to power_transactions:", error);
    }

    // Add fee column to e_zwich_withdrawals if it doesn't exist
    try {
      await sql`
        ALTER TABLE e_zwich_withdrawals 
        ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0
      `;
      console.log("✓ Added fee column to e_zwich_withdrawals");
    } catch (error) {
      console.log("⚠ Error adding fee to e_zwich_withdrawals:", error);
    }

    // Verify the columns were added
    const columnCheck = await sql`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('jumia_transactions', 'power_transactions', 'e_zwich_withdrawals')
      AND column_name = 'fee'
      ORDER BY table_name
    `;

    console.log("Fee columns check:", columnCheck);

    return NextResponse.json({
      success: true,
      message: "Fee columns added successfully",
      columns: columnCheck,
    });
  } catch (error) {
    console.error("Error adding fee columns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add fee columns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
