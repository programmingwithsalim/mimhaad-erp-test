import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Get all GL mappings
    const allMappings = await sql`
      SELECT 
        gm.*,
        fa.account_type as float_account_type,
        fa.provider as float_provider,
        ga.code as gl_account_code,
        ga.name as gl_account_name
      FROM gl_mappings gm
      LEFT JOIN float_accounts fa ON gm.float_account_id = fa.id
      LEFT JOIN gl_accounts ga ON gm.gl_account_id = ga.id
      WHERE gm.is_active = true
      ORDER BY gm.float_account_id, gm.transaction_type, gm.mapping_type
    `;

    // Get specific float account mappings
    const floatAccountId = "bb656fc8-0d85-45cf-901f-df4ffc860ede";
    const specificMappings = await sql`
      SELECT 
        gm.*,
        fa.account_type as float_account_type,
        fa.provider as float_provider,
        ga.code as gl_account_code,
        ga.name as gl_account_name
      FROM gl_mappings gm
      LEFT JOIN float_accounts fa ON gm.float_account_id = fa.id
      LEFT JOIN gl_accounts ga ON gm.gl_account_id = ga.id
      WHERE gm.float_account_id = ${floatAccountId}
      AND gm.is_active = true
      ORDER BY gm.transaction_type, gm.mapping_type
    `;

    // Get transaction-type based mappings
    const transactionTypeMappings = await sql`
      SELECT 
        gm.*,
        ga.code as gl_account_code,
        ga.name as gl_account_name
      FROM gl_mappings gm
      LEFT JOIN gl_accounts ga ON gm.gl_account_id = ga.id
      WHERE gm.transaction_type IN ('withdrawal', 'recharge', 'initial', 'adjustment')
      AND gm.float_account_id IS NULL
      AND gm.is_active = true
      ORDER BY gm.transaction_type, gm.mapping_type
    `;

    return NextResponse.json({
      success: true,
      data: {
        totalMappings: allMappings.length,
        specificFloatAccountMappings: specificMappings,
        transactionTypeMappings: transactionTypeMappings,
        summary: {
          hasWithdrawalMappings: specificMappings.some(m => m.transaction_type === 'withdrawal'),
          hasRechargeMappings: specificMappings.some(m => m.transaction_type === 'recharge'),
          hasInitialMappings: specificMappings.some(m => m.transaction_type === 'initial'),
          hasAdjustmentMappings: specificMappings.some(m => m.transaction_type === 'adjustment'),
          transactionTypesFound: [...new Set(specificMappings.map(m => m.transaction_type))],
        }
      }
    });
  } catch (error) {
    console.error("Error checking GL mappings:", error);
    return NextResponse.json(
      { error: "Failed to check GL mappings" },
      { status: 500 }
    );
  }
} 