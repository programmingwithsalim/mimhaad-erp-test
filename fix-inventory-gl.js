// Fix inventory GL mappings and expenses schema
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function fixInventoryGLAndExpenses() {
  try {
    console.log(
      "🔄 Starting migration: Fix inventory GL mappings and expenses schema"
    );

    // Get the main branch ID
    const branchId = "635844ab-029a-43f8-8523-d7882915266a";

    // Step 1: Check if expenses table has the correct schema
    console.log("📋 Checking expenses table schema...");
    const expensesColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      ORDER BY ordinal_position
    `;

    console.log(
      "Current expenses table columns:",
      expensesColumns.map((col) => col.column_name)
    );

    // Step 2: Add missing columns to expenses table if they don't exist
    const hasBranchId = expensesColumns.some(
      (col) => col.column_name === "branch_id"
    );
    const hasPaymentMethod = expensesColumns.some(
      (col) => col.column_name === "payment_method"
    );
    const hasMetadata = expensesColumns.some(
      (col) => col.column_name === "metadata"
    );

    if (!hasBranchId) {
      console.log("➕ Adding branch_id column to expenses table");
      await sql`ALTER TABLE expenses ADD COLUMN branch_id UUID REFERENCES branches(id)`;
    }

    if (!hasPaymentMethod) {
      console.log("➕ Adding payment_method column to expenses table");
      await sql`ALTER TABLE expenses ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash'`;
    }

    if (!hasMetadata) {
      console.log("➕ Adding metadata column to expenses table");
      await sql`ALTER TABLE expenses ADD COLUMN metadata JSONB DEFAULT '{}'`;
    }

    // Step 3: Get or create required GL accounts for inventory transactions
    console.log("📋 Getting GL accounts for inventory transactions...");

    // Get existing accounts or create them
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

    // Create accounts if they don't exist
    let inventoryAccountId = inventoryAccount[0]?.id;
    let expenseAccountId = expenseAccount[0]?.id;
    let adjustmentAccountId = adjustmentAccount[0]?.id;

    if (!inventoryAccountId) {
      console.log("➕ Creating inventory GL account");
      const result = await sql`
        INSERT INTO gl_accounts (id, code, name, type, branch_id, is_active)
        VALUES (
          gen_random_uuid(),
          'EZWICH-635844',
          'E-Zwich Inventory',
          'Asset',
          ${branchId},
          true
        )
        RETURNING id
      `;
      inventoryAccountId = result[0].id;
    }

    if (!expenseAccountId) {
      console.log("➕ Creating expense GL account");
      const result = await sql`
        INSERT INTO gl_accounts (id, code, name, type, branch_id, is_active)
        VALUES (
          gen_random_uuid(),
          'EXP-635844-GEN',
          'General Business Expenses',
          'Expense',
          ${branchId},
          true
        )
        RETURNING id
      `;
      expenseAccountId = result[0].id;
    }

    if (!adjustmentAccountId) {
      console.log("➕ Creating adjustment GL account");
      const result = await sql`
        INSERT INTO gl_accounts (id, code, name, type, branch_id, is_active)
        VALUES (
          gen_random_uuid(),
          'EXP-635844-ADJ',
          'Inventory Adjustments',
          'Expense',
          ${branchId},
          true
        )
        RETURNING id
      `;
      adjustmentAccountId = result[0].id;
    }

    // Step 4: Create GL mappings for inventory transactions
    console.log("📋 Creating GL mappings for inventory transactions...");

    // Check if inventory purchase mappings already exist
    const existingPurchaseMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_purchase' 
      AND branch_id = ${branchId}
    `;

    if (existingPurchaseMappings[0].count === 0) {
      console.log("➕ Creating inventory purchase GL mappings");
      await sql`
        INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
        VALUES 
          ('inventory_purchase', 'inventory', ${inventoryAccountId}, ${branchId}, true),
          ('inventory_purchase', 'payable', ${expenseAccountId}, ${branchId}, true)
      `;
    }

    // Check if inventory adjustment mappings already exist
    const existingAdjustmentMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_adjustment' 
      AND branch_id = ${branchId}
    `;

    if (existingAdjustmentMappings[0].count === 0) {
      console.log("➕ Creating inventory adjustment GL mappings");
      await sql`
        INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
        VALUES 
          ('inventory_adjustment', 'inventory', ${inventoryAccountId}, ${branchId}, true),
          ('inventory_adjustment', 'adjustment', ${adjustmentAccountId}, ${branchId}, true)
      `;
    }

    // Check if inventory reversal mappings already exist
    const existingReversalMappings = await sql`
      SELECT COUNT(*) as count FROM gl_mappings 
      WHERE transaction_type = 'inventory_reversal' 
      AND branch_id = ${branchId}
    `;

    if (existingReversalMappings[0].count === 0) {
      console.log("➕ Creating inventory reversal GL mappings");
      await sql`
        INSERT INTO gl_mappings (transaction_type, mapping_type, gl_account_id, branch_id, is_active)
        VALUES 
          ('inventory_reversal', 'inventory', ${inventoryAccountId}, ${branchId}, true),
          ('inventory_reversal', 'reversal', ${adjustmentAccountId}, ${branchId}, true)
      `;
    }

    // Step 5: Create expense head for inventory purchases if it doesn't exist
    console.log("📋 Creating expense head for inventory purchases...");
    const existingExpenseHead = await sql`
      SELECT id FROM expense_heads 
      WHERE name = 'Inventory Purchase' 
      LIMIT 1
    `;

    if (existingExpenseHead.length === 0) {
      await sql`
        INSERT INTO expense_heads (id, name, category, description, gl_account_code, is_active)
        VALUES (
          gen_random_uuid(),
          'Inventory Purchase',
          'operational',
          'Expenses related to purchasing inventory items',
          'EXP-635844-GEN',
          true
        )
      `;
      console.log("✅ Created 'Inventory Purchase' expense head");
    }

    // Step 6: Verify the setup
    console.log("📋 Verifying the setup...");

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

    const expenseHeads = await sql`
      SELECT name, description FROM expense_heads 
      WHERE name = 'Inventory Purchase'
    `;

    const finalExpensesColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      ORDER BY ordinal_position
    `;

    console.log("📋 Migration completed successfully!");
    console.log("Created GL mappings:");
    allMappings.forEach((mapping) => {
      console.log(
        `  - ${mapping.transaction_type} (${mapping.mapping_type}): ${mapping.account_code} - ${mapping.account_name}`
      );
    });

    console.log("Expense heads:", expenseHeads);
    console.log(
      "Final expenses table columns:",
      finalExpensesColumns.map((col) => col.column_name)
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration
fixInventoryGLAndExpenses()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
