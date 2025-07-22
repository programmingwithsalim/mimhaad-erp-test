import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log(
      "🔍 [MIGRATION] Adding payment_method and payment_account_id to power_transactions table..."
    );

    // Check if columns already exist
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'power_transactions' 
      AND column_name IN ('payment_method', 'payment_account_id')
    `;

    console.log("🔍 [MIGRATION] Existing columns:", existingColumns);

    // Add payment_method column if it doesn't exist
    if (!existingColumns.find((col) => col.column_name === "payment_method")) {
      console.log("🔍 [MIGRATION] Adding payment_method column...");
      await sql`
        ALTER TABLE power_transactions 
        ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash'
      `;
      console.log("🔍 [MIGRATION] payment_method column added successfully");
    }

    // Add payment_account_id column if it doesn't exist
    if (
      !existingColumns.find((col) => col.column_name === "payment_account_id")
    ) {
      console.log("🔍 [MIGRATION] Adding payment_account_id column...");
      await sql`
        ALTER TABLE power_transactions 
        ADD COLUMN payment_account_id VARCHAR(255)
      `;
      console.log(
        "🔍 [MIGRATION] payment_account_id column added successfully"
      );
    }

    // Verify the columns were added
    const finalColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'power_transactions' 
      AND column_name IN ('payment_method', 'payment_account_id')
    `;

    console.log("🔍 [MIGRATION] Final columns:", finalColumns);

    return NextResponse.json({
      success: true,
      message: "Payment method columns added to power_transactions table",
      columns: finalColumns,
    });
  } catch (error) {
    console.error("🔍 [MIGRATION] Error adding payment method columns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add payment method columns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
