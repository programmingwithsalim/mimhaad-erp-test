import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [GL] Starting to add missing reversal mappings...");

    // First, check current reversal mappings
    const currentReversals = await sql`
      SELECT 
        transaction_type,
        mapping_type,
        gl_account_id,
        float_account_id
      FROM gl_mappings 
      WHERE mapping_type = 'reversal' 
        AND branch_id = '635844ab-029a-43f8-8523-d7882915266a'
      ORDER BY transaction_type, gl_account_id;
    `;

    console.log("📊 [GL] Current reversal mappings:", currentReversals.rows);

    // Add reversal mappings for momo_float
    const momoReversal = await sql`
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
        'momo_float',
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '10334c13-1e4a-4143-831b-2d7527c90230', -- MoMo Float - Telecel GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [GL] Added momo_float reversal mapping");

    // Add reversal mappings for agency_banking_float
    const agencyReversal = await sql`
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
        'agency_banking_float',
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '613b5cee-71a0-4b81-8711-f1062292ed08', -- Agency Banking Float - Cal Bank GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [GL] Added agency_banking_float reversal mapping");

    // Add reversal mappings for e_zwich_float
    const ezwichReversal = await sql`
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
        'e_zwich_float',
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        'd6f63a11-9886-4550-bc09-d50a2a60f9e0', -- E-Zwich Float GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [GL] Added e_zwich_float reversal mapping");

    // Add reversal mappings for power_float (NEDCo)
    const powerNedcoReversal = await sql`
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
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '2cc88be1-f89c-4c68-88dd-385e798c320d', -- Power Float - NEDCo GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [GL] Added power_float NEDCo reversal mapping");

    // Add reversal mappings for power_float (ECG)
    const powerEcgReversal = await sql`
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
        '514767d8-e8ba-4ac2-8604-1885c67694c4', -- Cash in Till GL account
        '19bb8ad7-e8c5-4ea2-8978-1fc38db3aa10', -- Power Float - ECG GL account
        'reversal',
        true,
        NOW(),
        NOW()
      );
    `;

    console.log("✅ [GL] Added power_float ECG reversal mapping");

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

    console.log("✅ [GL] Updated power transaction status constraint");

    // Verify all reversal mappings were created
    const updatedReversals = await sql`
      SELECT 
        transaction_type,
        mapping_type,
        gl_account_id,
        float_account_id
      FROM gl_mappings 
      WHERE mapping_type = 'reversal' 
        AND branch_id = '635844ab-029a-43f8-8523-d7882915266a'
      ORDER BY transaction_type, gl_account_id;
    `;

    console.log("📊 [GL] Updated reversal mappings:", updatedReversals.rows);

    return NextResponse.json({
      success: true,
      message: "Missing reversal mappings added successfully",
      reversalsAdded: 5,
      totalReversals: updatedReversals.rows.length,
      reversals: updatedReversals.rows,
    });
  } catch (error) {
    console.error("❌ [GL] Error adding reversal mappings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add reversal mappings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
