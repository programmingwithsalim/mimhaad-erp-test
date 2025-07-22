import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("Adding payment source columns to fixed_assets table...");

    // Add payment_source column
    await sql`
      ALTER TABLE fixed_assets 
      ADD COLUMN IF NOT EXISTS payment_source character varying(50) DEFAULT 'cash'
    `;

    // Add payment_account_id column
    await sql`
      ALTER TABLE fixed_assets 
      ADD COLUMN IF NOT EXISTS payment_account_id uuid
    `;

    // Add foreign key constraint for payment_account_id (check if it doesn't exist first)
    const constraintExists = await sql`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_fixed_assets_payment_account' 
      AND table_name = 'fixed_assets'
    `;
    
    if (constraintExists.length === 0) {
      await sql`
        ALTER TABLE fixed_assets 
        ADD CONSTRAINT fk_fixed_assets_payment_account 
        FOREIGN KEY (payment_account_id) REFERENCES float_accounts(id) ON DELETE SET NULL
      `;
    }

    console.log(
      "Successfully added payment source columns to fixed_assets table"
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment source columns added successfully to fixed_assets table",
    });
  } catch (error) {
    console.error("Error adding payment source columns:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add payment source columns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
