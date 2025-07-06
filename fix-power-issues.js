const { sql } = require("@vercel/postgres");

async function fixPowerIssues() {
  try {
    console.log("🔧 [POWER] Starting power transaction fixes...");

    // 1. Fix power_transactions status constraint
    console.log("🔧 [POWER] Fixing status constraint...");

    await sql`
      ALTER TABLE power_transactions 
      DROP CONSTRAINT IF EXISTS power_transactions_status_check
    `;

    await sql`
      ALTER TABLE power_transactions 
      ADD CONSTRAINT power_transactions_status_check 
      CHECK (status::text = ANY (ARRAY['pending', 'completed', 'failed', 'cancelled', 'reversed']))
    `;

    console.log("✅ [POWER] Status constraint fixed");

    // 2. Add missing power_float GL mappings
    console.log("🔧 [POWER] Adding missing GL mappings...");

    const powerFloatAccounts = await sql`
      SELECT id, provider, account_type 
      FROM float_accounts 
      WHERE account_type = 'power' AND is_active = true
    `;

    console.log(
      `🔧 [POWER] Found ${powerFloatAccounts.length} power float accounts`
    );

    let addedMappings = 0;

    for (const account of powerFloatAccounts) {
      // Check if float mapping already exists
      const existingMapping = await sql`
        SELECT id FROM gl_mappings 
        WHERE transaction_type = 'power_float' 
        AND float_account_id = ${account.id} 
        AND mapping_type = 'float'
      `;

      if (existingMapping.length === 0) {
        // Add the missing float mapping
        await sql`
          INSERT INTO gl_mappings (
            id,
            branch_id,
            transaction_type,
            gl_account_id,
            float_account_id,
            mapping_type,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            '635844ab-029a-43f8-8523-d7882915266a',
            'power_float',
            ${account.id},
            ${account.id},
            'float',
            true,
            NOW(),
            NOW()
          )
        `;

        addedMappings++;
        console.log(`✅ [POWER] Added float mapping for: ${account.provider}`);
      } else {
        console.log(
          `ℹ️ [POWER] Float mapping already exists for: ${account.provider}`
        );
      }
    }

    console.log(`✅ [POWER] Fixes completed successfully!`);
    console.log(`📊 [POWER] Summary:`);
    console.log(`   - Status constraint updated to include 'reversed'`);
    console.log(`   - Added ${addedMappings} power_float float mappings`);
    console.log(`   - Total power accounts: ${powerFloatAccounts.length}`);
  } catch (error) {
    console.error("❌ [POWER] Error fixing power issues:", error);
    process.exit(1);
  }
}

fixPowerIssues();
