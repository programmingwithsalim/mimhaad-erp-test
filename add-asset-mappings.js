const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function addAssetMappings() {
  try {
    console.log(
      "🔧 Adding missing 'asset' GL mappings for existing float accounts..."
    );

    // Get all float accounts that don't have asset mappings
    const floatAccounts = await sql`
      SELECT DISTINCT 
        fa.id as float_account_id,
        fa.account_type,
        fa.provider,
        fa.branch_id,
        glm.gl_account_id,
        glm.transaction_type
      FROM float_accounts fa
      JOIN gl_mappings glm ON fa.id = glm.float_account_id
      WHERE fa.is_active = true
        AND glm.mapping_type = 'main'
        AND NOT EXISTS (
          SELECT 1 FROM gl_mappings 
          WHERE float_account_id = fa.id 
            AND mapping_type = 'asset'
        )
    `;

    console.log(
      `📊 Found ${floatAccounts.length} float accounts missing asset mappings`
    );

    let addedCount = 0;
    for (const account of floatAccounts) {
      // Add asset mapping (same as main account)
      await sql`
        INSERT INTO gl_mappings (
          transaction_type,
          gl_account_id,
          float_account_id,
          mapping_type,
          branch_id,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${account.transaction_type},
          ${account.gl_account_id},
          ${account.float_account_id},
          'asset',
          ${account.branch_id},
          true,
          NOW(),
          NOW()
        )
      `;

      addedCount++;
      console.log(
        `✅ Added asset mapping for ${account.account_type} float account: ${account.float_account_id}`
      );
    }

    console.log(`🎉 Successfully added ${addedCount} asset mappings`);

    // Verify the mappings were added
    const verification = await sql`
      SELECT 
        fa.account_type,
        fa.provider,
        COUNT(glm.mapping_type) as mapping_count,
        STRING_AGG(glm.mapping_type, ', ' ORDER BY glm.mapping_type) as mapping_types
      FROM float_accounts fa
      JOIN gl_mappings glm ON fa.id = glm.float_account_id
      WHERE fa.is_active = true
      GROUP BY fa.id, fa.account_type, fa.provider
      ORDER BY fa.account_type, fa.provider
    `;

    console.log("\n📋 Verification - Current mappings per float account:");
    verification.forEach((row) => {
      console.log(
        `  ${row.account_type}${row.provider ? ` (${row.provider})` : ""}: ${
          row.mapping_types
        } (${row.mapping_count} mappings)`
      );
    });
  } catch (error) {
    console.error("❌ Error adding asset mappings:", error);
    throw error;
  }
}

// Run the migration
addAssetMappings()
  .then(() => {
    console.log("✅ Asset mappings migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Asset mappings migration failed:", error);
    process.exit(1);
  });
