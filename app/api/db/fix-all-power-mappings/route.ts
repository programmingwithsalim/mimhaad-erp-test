import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [POWER] Starting comprehensive power mappings fix...");

    // First, check current mappings
    const currentMappings = await sql`
      SELECT 
        id,
        mapping_type,
        gl_account_id,
        float_account_id,
        is_active
      FROM gl_mappings 
      WHERE transaction_type = 'power_float' 
        AND branch_id = '635844ab-029a-43f8-8523-d7882915266a'
      ORDER BY mapping_type, gl_account_id;
    `;

    console.log("📊 [POWER] Current mappings:", currentMappings.rows);

    // Clear existing problematic mappings
    const deleteResult = await sql`
      DELETE FROM gl_mappings 
      WHERE transaction_type = 'power_float' 
        AND branch_id = '635844ab-029a-43f8-8523-d7882915266a'
        AND mapping_type IN ('main', 'float', 'reversal');
    `;

    console.log("🗑️ [POWER] Deleted existing mappings:", deleteResult.rowCount);

    // Add comprehensive mappings for NEDCo Power Float
    const nedcoMappings = await sql`
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
      ) VALUES 
      -- Main mapping (Cash in Till as main account for NEDCo)
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '2cc88be1-f89c-4c68-88dd-385e798c320d', -- Power Float - NEDCo GL account
        'main',
        true,
        NOW(),
        NOW()
      ),
      -- Float mapping (NEDCo Power Float account)
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '2cc88be1-f89c-4c68-88dd-385e798c320d', -- Power Float - NEDCo GL account
        '2fe947a8-c85f-42b8-9aff-c85bc4439484', -- NEDCo float account
        'float',
        true,
        NOW(),
        NOW()
      ),
      -- Reversal mapping for NEDCo
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '2cc88be1-f89c-4c68-88dd-385e798c320d', -- Power Float - NEDCo GL account
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [POWER] Added NEDCo mappings");

    // Add comprehensive mappings for ECG Power Float
    const ecgMappings = await sql`
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
      ) VALUES 
      -- Main mapping (Cash in Till as main account for ECG)
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10', -- Power Float - ECG GL account
        'main',
        true,
        NOW(),
        NOW()
      ),
      -- Float mapping (ECG Power Float account)
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10', -- Power Float - ECG GL account
        'd1a2470c-3528-426e-afd5-b40d0f2ba9ca', -- ECG float account
        'float',
        true,
        NOW(),
        NOW()
      ),
      -- Reversal mapping for ECG
      (
        gen_random_uuid(),
        '635844ab-029a-43f8-8523-d7882915266a',
        'power_float',
        '19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10', -- Power Float - ECG GL account
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [POWER] Added ECG mappings");

    // Fix power transaction status constraint
    const constraintResult = await sql`
      ALTER TABLE power_transactions 
      DROP CONSTRAINT IF EXISTS power_transactions_status_check;
    `;

    const newConstraint = await sql`
      ALTER TABLE power_transactions 
      ADD CONSTRAINT power_transactions_status_check 
      CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'deleted'));
    `;

    console.log("✅ [POWER] Updated status constraint");

    // Verify all mappings were created correctly
    const updatedMappings = await sql`
      SELECT 
        id,
        mapping_type,
        gl_account_id,
        float_account_id,
        is_active
      FROM gl_mappings 
      WHERE transaction_type = 'power_float' 
        AND branch_id = '635844ab-029a-43f8-8523-d7882915266a'
        AND is_active = true
      ORDER BY mapping_type, gl_account_id;
    `;

    console.log("📊 [POWER] Updated mappings:", updatedMappings.rows);

    return NextResponse.json({
      success: true,
      message: "Comprehensive power mappings fix completed successfully",
      deletedCount: deleteResult.rowCount,
      nedcoMappingsAdded: 3,
      ecgMappingsAdded: 3,
      totalMappings: updatedMappings.rows.length,
      mappings: updatedMappings.rows,
    });
  } catch (error) {
    console.error("❌ [POWER] Error fixing power mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix power mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
