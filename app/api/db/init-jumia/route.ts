import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "DATABASE_URL environment variable is not set",
        },
        { status: 500 }
      );
    }

    console.log("Initializing Jumia database tables...");

    const sql = neon(process.env.DATABASE_URL);

    // Create Jumia transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS jumia_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        product_type VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        commission DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        branch_id UUID,
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log("Jumia database tables initialized successfully");

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('jumia_transactions')
    `;

    return NextResponse.json({
      success: true,
      message: "Jumia database initialized successfully",
      tables: tables.map((t: any) => t.table_name),
    });
  } catch (error) {
    console.error("Error initializing Jumia database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize Jumia database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
