import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth-service";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔧 Fixing power transaction status constraint...");

    // Drop the existing constraint
    await sql`
      ALTER TABLE power_transactions 
      DROP CONSTRAINT IF EXISTS power_transactions_status_check
    `;

    // Add the new constraint with additional statuses
    await sql`
      ALTER TABLE power_transactions 
      ADD CONSTRAINT power_transactions_status_check 
      CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'deleted'))
    `;

    console.log("✅ Power transaction status constraint updated successfully");

    return NextResponse.json({
      success: true,
      message:
        "Power transaction status constraint updated to include 'reversed' and 'deleted' statuses",
    });
  } catch (error) {
    console.error("❌ Error fixing power status constraint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix power status constraint",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
