const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function fixPowerIssues() {
  try {
    console.log("🔧 [POWER] Starting comprehensive power fixes...");

    // 1. Fix power_transactions status constraint
    console.log("🔧 [POWER] Fixing status constraint...");

    await sql`
      ALTER TABLE power_transactions 
      DROP CONSTRAINT IF EXISTS power_transactions_status_check
    `;

    await sql`
      ALTER TABLE power_transactions 
      ADD CONSTRAINT power_transactions_status_check 
      CHECK (status::text = ANY (ARRAY['pending', 'completed', 'failed', 'cancelled', 'reversed', 'deleted']))
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

    for (const account of powerFloatAccounts) {
      // Check if float mapping already exists
      const existingMapping = await sql`
        SELECT id FROM gl_mappings 
        WHERE transaction_type = 'power_float' 
        AND mapping_type = 'float'
        AND float_account_id = ${account.id}
      `;

      if (existingMapping.length === 0) {
        // Get GL account for this float account
        const glAccount = await sql`
          SELECT id FROM gl_accounts 
          WHERE account_name ILIKE '%${account.provider}%' 
          OR account_name ILIKE '%power%'
          LIMIT 1
        `;

        const glAccountId =
          glAccount.length > 0
            ? glAccount[0].id
            : "2cc88be1-f89c-4c68-88dd-385e798c320d"; // Default power GL account

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
            ${glAccountId},
            ${account.id},
            'float',
            true,
            NOW(),
            NOW()
          )
        `;
        console.log(`✅ [POWER] Added float mapping for ${account.provider}`);
      }
    }

    // 3. Create default power float accounts if they don't exist
    console.log("🔧 [POWER] Checking for default power accounts...");

    const defaultProviders = ["ECG", "NEDCo"];
    const branchId = "635844ab-029a-43f8-8523-d7882915266a";

    for (const provider of defaultProviders) {
      const existingAccount = await sql`
        SELECT id FROM float_accounts 
        WHERE provider = ${provider} AND account_type = 'power'
      `;

      if (existingAccount.length === 0) {
        await sql`
          INSERT INTO float_accounts (
            provider,
            account_type,
            account_number,
            current_balance,
            min_threshold,
            max_threshold,
            is_active,
            notes,
            branch_id,
            created_by
          ) VALUES (
            ${provider},
            'power',
            ${`${provider.toUpperCase()}-${Date.now()}`},
            10000,
            1000,
            50000,
            true,
            ${`Default ${provider} power float account`},
            ${branchId},
            '00000000-0000-0000-0000-000000000000'
          )
        `;
        console.log(`✅ [POWER] Created ${provider} power float account`);
      } else {
        console.log(
          `✅ [POWER] ${provider} power float account already exists`
        );
      }
    }

    // 4. Update existing power transactions to have proper status
    console.log("🔧 [POWER] Updating existing power transactions...");

    await sql`
      UPDATE power_transactions 
      SET status = 'completed' 
      WHERE status NOT IN ('pending', 'completed', 'failed', 'cancelled', 'reversed', 'deleted')
    `;

    console.log("✅ [POWER] Updated existing power transactions");

    // 5. Show final status
    const finalPowerFloats = await sql`
      SELECT id, provider, account_type, current_balance, is_active
      FROM float_accounts 
      WHERE account_type = 'power' OR provider ILIKE '%power%' OR provider ILIKE '%electricity%'
      ORDER BY created_at DESC
    `;

    console.log(
      `\n📊 [POWER] Final status: ${finalPowerFloats.length} power float accounts`
    );
    finalPowerFloats.forEach((account) => {
      console.log(
        `  - ${account.provider} (${account.account_type}): GHS ${
          account.current_balance
        } - ${account.is_active ? "Active" : "Inactive"}`
      );
    });

    const glMappings = await sql`
      SELECT transaction_type, mapping_type, COUNT(*) as count
      FROM gl_mappings 
      WHERE transaction_type = 'power_float'
      GROUP BY transaction_type, mapping_type
    `;

    console.log(`\n📊 [POWER] GL mappings: ${glMappings.length} mapping types`);
    glMappings.forEach((mapping) => {
      console.log(
        `  - ${mapping.transaction_type} (${mapping.mapping_type}): ${mapping.count} mappings`
      );
    });

    console.log("\n✅ [POWER] All power issues fixed successfully!");
  } catch (error) {
    console.error("❌ [POWER] Error fixing power issues:", error);
  }
}

fixPowerIssues();
