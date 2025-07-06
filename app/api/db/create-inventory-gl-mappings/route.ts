import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting migration: Create inventory GL mappings");

    // Get the main branch ID
    const branchId = "635844ab-029a-43f8-8523-d7882915266a";

    // Get existing GL accounts for inventory transactions
    const inventoryAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EZWICH-635844' AND branch_id = ${branchId}
      LIMIT 1
    `;

    const expenseAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EZWICH-635844-EXP' AND branch_id = ${branchId}
      LIMIT 1
    `;

    const adjustmentAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EXP-635844-GEN' AND branch_id = ${branchId}
      LIMIT 1
    `;

    console.log("📋 Found accounts:", {
      inventory: inventoryAccount[0]?.code,
      expense: expenseAccount[0]?.code,
      adjustment: adjustmentAccount[0]?.code
    });

    // Check if inventory purchase mappings already exist
    const existingPurchaseMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_purchase' 
      AND branch_id = ${branchId}
    `;

    if (existingPurchaseMappings[0].count === 0) {
      console.log("➕ Creating inventory purchase GL mappings");
      
      if (inventoryAccount[0] && expenseAccount[0]) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES 
            ('inventory_purchase', 'inventory', ${inventoryAccount[0].id}, ${branchId}, true),
            ('inventory_purchase', 'payable', ${expenseAccount[0].id}, ${branchId}, true)
        `;
        console.log("✅ Created inventory purchase mappings");
      } else {
        console.log("⚠️ Missing required accounts for inventory purchase mappings");
      }
    }

    // Check if inventory adjustment mappings already exist
    const existingAdjustmentMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_adjustment' 
      AND branch_id = ${branchId}
    `;

    if (existingAdjustmentMappings[0].count === 0) {
      console.log("➕ Creating inventory adjustment GL mappings");
      
      if (inventoryAccount[0] && adjustmentAccount[0]) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES 
            ('inventory_adjustment', 'inventory', ${inventoryAccount[0].id}, ${branchId}, true),
            ('inventory_adjustment', 'adjustment', ${adjustmentAccount[0].id}, ${branchId}, true)
        `;
        console.log("✅ Created inventory adjustment mappings");
      } else {
        console.log("⚠️ Missing required accounts for inventory adjustment mappings");
      }
    }

    // Check if inventory reversal mappings already exist
    const existingReversalMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_reversal' 
      AND branch_id = ${branchId}
    `;

    if (existingReversalMappings[0].count === 0) {
      console.log("➕ Creating inventory reversal GL mappings");
      
      if (inventoryAccount[0] && adjustmentAccount[0]) {
        await sql`
          INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES 
            ('inventory_reversal', 'inventory', ${inventoryAccount[0].id}, ${branchId}, true),
            ('inventory_reversal', 'reversal', ${adjustmentAccount[0].id}, ${branchId}, true)
        `;
        console.log("✅ Created inventory reversal mappings");
      } else {
        console.log("⚠️ Missing required accounts for inventory reversal mappings");
      }
    }

    // Verify the mappings
    const allMappings = await sql`
      SELECT 
        gm.transaction_type,
        gm.mapping_type,
        ga.code as account_code,
        ga.name as account_name
      FROM gl_mappings gm
      JOIN gl_accounts ga ON gm.gl_account_id = ga.id
      WHERE gm.transaction_type IN ('inventory_purchase', 'inventory_adjustment', 'inventory_reversal')
      AND gm.branch_id = ${branchId}
      ORDER BY gm.transaction_type, gm.mapping_type
    `;

    console.log("📋 Created GL mappings:");
    allMappings.forEach((mapping: any) => {
      console.log(`  - ${mapping.transaction_type} (${mapping.mapping_type}): ${mapping.account_code} - ${mapping.account_name}`);
    });

    return NextResponse.json({
      success: true,
      message: "Inventory GL mappings created successfully",
      mappings: allMappings,
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