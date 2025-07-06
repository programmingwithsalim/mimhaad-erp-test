import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [POWER] Fixing power_transactions status constraint...");

    // Drop the existing constraint
    await sql`
      ALTER TABLE power_transactions 
      DROP CONSTRAINT IF EXISTS power_transactions_status_check
    `;

    console.log("✅ [POWER] Dropped existing status constraint");

    // Add the new constraint with 'reversed' status
    await sql`
      ALTER TABLE power_transactions 
      ADD CONSTRAINT power_transactions_status_check 
      CHECK (status::text = ANY (ARRAY['pending', 'completed', 'failed', 'cancelled', 'reversed']))
    `;

    console.log(
      "✅ [POWER] Added new status constraint with 'reversed' status"
    );

    // Verify the constraint
    const constraintCheck = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'power_transactions_status_check'
    `;

    return NextResponse.json({
      success: true,
      message: "Power transactions status constraint updated successfully",
      constraint: constraintCheck[0],
    });
  } catch (error) {
    console.error("❌ [POWER] Error fixing status constraint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix power transactions status constraint",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
