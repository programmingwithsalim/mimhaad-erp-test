import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting migration: Fix inventory schema");

    // 1. Fix GL mappings table - add gl_account_code and gl_account_name columns
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

    const glAccountNameExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'gl_mappings' 
        AND column_name = 'gl_account_name'
      );
    `;

    if (!glAccountNameExists[0].exists) {
      console.log("➕ Adding gl_account_name column to gl_mappings table");
      await sql`
        ALTER TABLE gl_mappings 
        ADD COLUMN gl_account_name VARCHAR(100)
      `;
      console.log("✅ Added gl_account_name column to gl_mappings");
    }

    // 2. Fix expenses table - add payment_method and metadata columns
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

    const metadataExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'metadata'
      );
    `;

    if (!metadataExists[0].exists) {
      console.log("➕ Adding metadata column to expenses table");
      await sql`
        ALTER TABLE expenses 
        ADD COLUMN metadata JSONB
      `;
      console.log("✅ Added metadata column to expenses table");
    }

    // 3. Update existing GL mappings with account codes and names
    const glMappingsWithoutCode = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE gl_account_code IS NULL
    `;

    if (glMappingsWithoutCode[0].count > 0) {
      console.log(
        "🔄 Updating existing GL mappings with account codes and names"
      );

      // Get account codes and names from gl_accounts table
      const accountData = await sql`
        SELECT id, account_code, account_name FROM gl_accounts 
        WHERE account_code IS NOT NULL
      `;

      // Update GL mappings with account codes and names
      for (const account of accountData) {
        await sql`
          UPDATE gl_mappings 
          SET gl_account_code = ${account.account_code},
              gl_account_name = ${account.account_name}
          WHERE gl_account_id = ${account.id} 
          AND (gl_account_code IS NULL OR gl_account_name IS NULL)
        `;
      }
      console.log("✅ Updated GL mappings with account codes and names");
    }

    // 4. Create GL mappings for inventory transactions if they don't exist
    const inventoryMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type IN ('inventory_purchase', 'inventory_adjustment', 'inventory_reversal')
    `;

    if (inventoryMappings[0].count === 0) {
      console.log("🔄 Creating GL mappings for inventory transactions");

      // Get default accounts
      const defaultAccounts = await sql`
        SELECT id, account_code, account_name FROM gl_accounts 
        WHERE account_code IN ('1200', '2100', '6000', '6100')
      `;

      const accountMap: Record<string, any> = {};
      defaultAccounts.forEach((acc: any) => {
        if (acc.account_code === "1200") accountMap.inventory = acc;
        if (acc.account_code === "2100") accountMap.payable = acc;
        if (acc.account_code === "6000") accountMap.expense = acc;
        if (acc.account_code === "6100") accountMap.adjustment = acc;
      });

      // Create inventory purchase mappings
      if (accountMap.inventory && accountMap.payable) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, gl_account_code, gl_account_name, branch_id, is_active)
          VALUES 
            ('inventory_purchase', 'inventory', ${accountMap.inventory.id}, ${accountMap.inventory.account_code}, ${accountMap.inventory.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true),
            ('inventory_purchase', 'payable', ${accountMap.payable.id}, ${accountMap.payable.account_code}, ${accountMap.payable.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true)
        `;
      }

      // Create inventory adjustment mappings
      if (accountMap.inventory && accountMap.adjustment) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, gl_account_code, gl_account_name, branch_id, is_active)
          VALUES 
            ('inventory_adjustment', 'inventory', ${accountMap.inventory.id}, ${accountMap.inventory.account_code}, ${accountMap.inventory.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true),
            ('inventory_adjustment', 'adjustment', ${accountMap.adjustment.id}, ${accountMap.adjustment.account_code}, ${accountMap.adjustment.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true)
        `;
      }

      // Create inventory reversal mappings
      if (accountMap.inventory && accountMap.adjustment) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, gl_account_code, gl_account_name, branch_id, is_active)
          VALUES 
            ('inventory_reversal', 'inventory', ${accountMap.inventory.id}, ${accountMap.inventory.account_code}, ${accountMap.inventory.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true),
            ('inventory_reversal', 'reversal', ${accountMap.adjustment.id}, ${accountMap.adjustment.account_code}, ${accountMap.adjustment.account_name}, '635844ab-029a-43f8-8523-d7882915266a', true)
        `;
      }

      console.log("✅ Created GL mappings for inventory transactions");
    }

    // 5. Verify the schema
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
