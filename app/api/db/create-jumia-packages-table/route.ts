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

    console.log("🔧 [JUMIA] Creating jumia_packages table...");

    // Create jumia_packages table
    await sql`
      CREATE TABLE IF NOT EXISTS jumia_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tracking_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'delivered', 'settled')),
        received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        delivered_at TIMESTAMP WITH TIME ZONE,
        settled_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Ensure unique tracking ID per branch
        UNIQUE(tracking_id, branch_id)
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_packages_branch_id ON jumia_packages(branch_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_packages_status ON jumia_packages(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_packages_tracking_id ON jumia_packages(tracking_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_jumia_packages_created_at ON jumia_packages(created_at DESC)
    `;

    console.log("✅ [JUMIA] jumia_packages table created successfully");

    return NextResponse.json({
      success: true,
      message: "jumia_packages table created successfully",
    });
  } catch (error) {
    console.error("❌ [JUMIA] Error creating jumia_packages table:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
