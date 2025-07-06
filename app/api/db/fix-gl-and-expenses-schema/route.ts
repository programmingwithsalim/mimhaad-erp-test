import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting migration: Fix GL and Expenses schema");

    // Fix GL mappings table - add gl_account_code column if it doesn't exist
    const glAccountCodeExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'gl_mappings' 
        AND column_name = 'gl_account_code'
      );
    `;

    if (!glAccountCodeExists[0].exists) {
      console.log("➕ Adding gl_account_code column to gl_mappings table");
      await sql`
        ALTER TABLE gl_mappings 
        ADD COLUMN gl_account_code VARCHAR(20)
      `;
      console.log("✅ Added gl_account_code column to gl_mappings");
    }

    // Fix expenses table - add payment_method column if it doesn't exist
    const paymentMethodExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'payment_method'
      );
    `;

    if (!paymentMethodExists[0].exists) {
      console.log("➕ Adding payment_method column to expenses table");
      await sql`
        ALTER TABLE expenses 
        ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'
      `;
      console.log("✅ Added payment_method column to expenses table");
    }

    // Update existing GL mappings to have account codes
    const glMappingsWithoutCode = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE gl_account_code IS NULL
    `;

    if (glMappingsWithoutCode[0].count > 0) {
      console.log("🔄 Updating existing GL mappings with account codes");

      // Get account codes from gl_accounts table
      const accountCodes = await sql`
        SELECT id, account_code FROM gl_accounts 
        WHERE account_code IS NOT NULL
      `;

      // Update GL mappings with account codes
      for (const account of accountCodes) {
        await sql`
          UPDATE gl_mappings 
          SET gl_account_code = ${account.account_code}
          WHERE gl_account_id = ${account.id} 
          AND gl_account_code IS NULL
        `;
      }
      console.log("✅ Updated GL mappings with account codes");
    }

    // Verify the schema
    const glMappingsColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'gl_mappings' 
      ORDER BY ordinal_position
    `;

    const expensesColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      ORDER BY ordinal_position
    `;

    console.log("📋 GL Mappings table structure:");
    glMappingsColumns.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    console.log("📋 Expenses table structure:");
    expensesColumns.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      glMappingsColumns,
      expensesColumns,
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
