import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log(
      "🔍 [MIGRATION] Fixing float_account_id column size in power_transactions table..."
    );

    // Check current column definition
    const currentColumn = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'power_transactions' 
      AND column_name = 'float_account_id'
    `;

    console.log(
      "🔍 [MIGRATION] Current float_account_id column:",
      currentColumn
    );

    if (currentColumn.length > 0) {
      const column = currentColumn[0];

      // If the column exists and is too small for UUIDs (36 characters)
      if (
        column.character_maximum_length &&
        column.character_maximum_length < 36
      ) {
        console.log(
          "🔍 [MIGRATION] Updating float_account_id column size to VARCHAR(255)..."
        );

        await sql`
          ALTER TABLE power_transactions 
          ALTER COLUMN float_account_id TYPE VARCHAR(255)
        `;

        console.log(
          "🔍 [MIGRATION] float_account_id column size updated successfully"
        );
      } else {
        console.log(
          "🔍 [MIGRATION] float_account_id column size is already sufficient"
        );
      }
    } else {
      console.log(
        "🔍 [MIGRATION] float_account_id column does not exist, creating it..."
      );

      await sql`
        ALTER TABLE power_transactions 
        ADD COLUMN float_account_id VARCHAR(255)
      `;

      console.log(
        "🔍 [MIGRATION] float_account_id column created successfully"
      );
    }

    // Verify the column was updated
    const finalColumn = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'power_transactions' 
      AND column_name = 'float_account_id'
    `;

    console.log("🔍 [MIGRATION] Final float_account_id column:", finalColumn);

    return NextResponse.json({
      success: true,
      message: "float_account_id column size fixed in power_transactions table",
      column: finalColumn[0],
    });
  } catch (error) {
    console.error(
      "🔍 [MIGRATION] Error fixing float_account_id column:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix float_account_id column",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
