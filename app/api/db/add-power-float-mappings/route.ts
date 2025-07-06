import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [GL] Adding missing power_float mappings...");

    // Get all power float accounts
    const powerFloatAccounts = await sql`
      SELECT id, provider, account_type 
      FROM float_accounts 
      WHERE account_type = 'power' AND is_active = true
    `;

    console.log(
      `🔧 [GL] Found ${powerFloatAccounts.length} power float accounts`
    );

    const addedMappings = [];

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
        const result = await sql`
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
          RETURNING id, gl_account_id, float_account_id, mapping_type
        `;

        addedMappings.push(result[0]);
        console.log(
          `✅ [GL] Added float mapping for power account: ${account.provider}`
        );
      } else {
        console.log(
          `ℹ️ [GL] Float mapping already exists for power account: ${account.provider}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${addedMappings.length} power_float float mappings`,
      addedMappings,
      totalPowerAccounts: powerFloatAccounts.length,
    });
  } catch (error) {
    console.error("❌ [GL] Error adding power_float mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add power_float mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
