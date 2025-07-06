import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [POWER] Checking power float accounts...");

    // Check existing power float accounts
    const existingPowerFloats = await sql`
      SELECT id, provider, account_type, current_balance, is_active, branch_id
      FROM float_accounts 
      WHERE account_type = 'power' OR provider ILIKE '%power%' OR provider ILIKE '%electricity%'
      ORDER BY created_at DESC
    `;

    console.log(`🔍 [POWER] Found ${existingPowerFloats.length} existing power float accounts`);

    // Check if we need to create default power accounts
    const defaultProviders = ['ECG', 'NEDCo'];
    const branchId = '635844ab-029a-43f8-8523-d7882915266a'; // Main branch

    const missingProviders = defaultProviders.filter(provider => 
      !existingPowerFloats.some(account => 
        account.provider.toLowerCase() === provider.toLowerCase()
      )
    );

    console.log(`🔍 [POWER] Missing providers: ${missingProviders.join(', ')}`);

    if (missingProviders.length > 0) {
      console.log("🔧 [POWER] Creating missing power float accounts...");
      
      for (const provider of missingProviders) {
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
      }
    }

    // Get updated list
    const updatedPowerFloats = await sql`
      SELECT id, provider, account_type, current_balance, is_active, branch_id
      FROM float_accounts 
      WHERE account_type = 'power' OR provider ILIKE '%power%' OR provider ILIKE '%electricity%'
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      existingAccounts: existingPowerFloats,
      createdAccounts: missingProviders,
      totalAccounts: updatedPowerFloats.length,
      accounts: updatedPowerFloats,
    });

  } catch (error) {
    console.error("❌ [POWER] Error checking power floats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check power float accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 