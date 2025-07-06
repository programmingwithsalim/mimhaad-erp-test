// Add missing inventory GL mappings
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function addInventoryMappings() {
  try {
    console.log("🔄 Adding missing inventory GL mappings...");

    const branchId = "635844ab-029a-43f8-8523-d7882915266a";

    // Get the required GL accounts for this branch
    console.log("📋 Getting GL accounts for inventory mappings...");

    const inventoryAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EZWICH-635844' AND branch_id = ${branchId}
      LIMIT 1
    `;

    const expenseAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EXP-635844-GEN' AND branch_id = ${branchId}
      LIMIT 1
    `;

    const adjustmentAccount = await sql`
      SELECT id, code, name FROM gl_accounts 
      WHERE code = 'EXP-635844-ADJ' AND branch_id = ${branchId}
      LIMIT 1
    `;

    console.log("Found accounts:", {
      inventory: inventoryAccount[0]?.code,
      expense: expenseAccount[0]?.code,
      adjustment: adjustmentAccount[0]?.code,
    });

    if (!inventoryAccount[0] || !expenseAccount[0] || !adjustmentAccount[0]) {
      throw new Error(
        "Missing required GL accounts. Please run the inventory GL setup first."
      );
    }

    const inventoryAccountId = inventoryAccount[0].id;
    const expenseAccountId = expenseAccount[0].id;
    const adjustmentAccountId = adjustmentAccount[0].id;

    // Check existing mappings
    console.log("📋 Checking existing inventory mappings...");
    const existingMappings = await sql`
      SELECT transaction_type, mapping_type, gl_account_id 
      FROM gl_mappings 
      WHERE transaction_type IN ('inventory_purchase', 'inventory_adjustment', 'inventory_reversal')
      AND branch_id = ${branchId}
    `;

    console.log("Existing inventory mappings:", existingMappings);

    // Create inventory purchase mappings
    const purchaseMappings = [
      {
        transaction_type: "inventory_purchase",
        mapping_type: "inventory",
        gl_account_id: inventoryAccountId,
      },
      {
        transaction_type: "inventory_purchase",
        mapping_type: "payable",
        gl_account_id: expenseAccountId,
      },
    ];

    // Create inventory adjustment mappings
    const adjustmentMappings = [
      {
        transaction_type: "inventory_adjustment",
        mapping_type: "inventory",
        gl_account_id: inventoryAccountId,
      },
      {
        transaction_type: "inventory_adjustment",
        mapping_type: "adjustment",
        gl_account_id: adjustmentAccountId,
      },
    ];

    // Create inventory reversal mappings
    const reversalMappings = [
      {
        transaction_type: "inventory_reversal",
        mapping_type: "inventory",
        gl_account_id: inventoryAccountId,
      },
      {
        transaction_type: "inventory_reversal",
        mapping_type: "reversal",
        gl_account_id: adjustmentAccountId,
      },
    ];

    // Insert mappings that don't exist
    console.log("➕ Creating inventory purchase mappings...");
    for (const mapping of purchaseMappings) {
      const exists = existingMappings.some(
        (existing) =>
          existing.transaction_type === mapping.transaction_type &&
          existing.mapping_type === mapping.mapping_type
      );

      if (!exists) {
        await sql`
          INSERT INTO gl_mappings (id, transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES (
            gen_random_uuid(),
            ${mapping.transaction_type},
            ${mapping.mapping_type},
            ${mapping.gl_account_id},
            ${branchId},
            true
          )
        `;
        console.log(
          `✅ Created ${mapping.transaction_type} (${mapping.mapping_type}) mapping`
        );
      } else {
        console.log(
          `⏭️ ${mapping.transaction_type} (${mapping.mapping_type}) mapping already exists`
        );
      }
    }

    console.log("➕ Creating inventory adjustment mappings...");
    for (const mapping of adjustmentMappings) {
      const exists = existingMappings.some(
        (existing) =>
          existing.transaction_type === mapping.transaction_type &&
          existing.mapping_type === mapping.mapping_type
      );

      if (!exists) {
        await sql`
          INSERT INTO gl_mappings (id, transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES (
            gen_random_uuid(),
            ${mapping.transaction_type},
            ${mapping.mapping_type},
            ${mapping.gl_account_id},
            ${branchId},
            true
          )
        `;
        console.log(
          `✅ Created ${mapping.transaction_type} (${mapping.mapping_type}) mapping`
        );
      } else {
        console.log(
          `⏭️ ${mapping.transaction_type} (${mapping.mapping_type}) mapping already exists`
        );
      }
    }

    console.log("➕ Creating inventory reversal mappings...");
    for (const mapping of reversalMappings) {
      const exists = existingMappings.some(
        (existing) =>
          existing.transaction_type === mapping.transaction_type &&
          existing.mapping_type === mapping.mapping_type
      );

      if (!exists) {
        await sql`
          INSERT INTO gl_mappings (id, transaction_type, mapping_type, gl_account_id, branch_id, is_active)
          VALUES (
            gen_random_uuid(),
            ${mapping.transaction_type},
            ${mapping.mapping_type},
            ${mapping.gl_account_id},
            ${branchId},
            true
          )
        `;
        console.log(
          `✅ Created ${mapping.transaction_type} (${mapping.mapping_type}) mapping`
        );
      } else {
        console.log(
          `⏭️ ${mapping.transaction_type} (${mapping.mapping_type}) mapping already exists`
        );
      }
    }

    // Verify all mappings are now present
    console.log("📋 Verifying all inventory mappings...");
    const finalMappings = await sql`
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

    console.log("📋 All inventory mappings:");
    finalMappings.forEach((mapping) => {
      console.log(
        `  - ${mapping.transaction_type} (${mapping.mapping_type}): ${mapping.account_code} - ${mapping.account_name}`
      );
    });

    console.log("✅ Inventory GL mappings added successfully!");
  } catch (error) {
    console.error("❌ Failed to add inventory mappings:", error);
    throw error;
  }
}

// Run the script
addInventoryMappings()
  .then(() => {
    console.log("✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
