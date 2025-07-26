import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔧 [POWER] Ensuring power float accounts exist for all branches..."
    );

    // Get all branches
    const branches = await sql`
      SELECT id, name FROM branches WHERE is_active = true
    `;

    console.log(`🔍 [POWER] Found ${branches.length} active branches`);

    const powerProviders = ["ECG", "NEDCo"];
    const createdAccounts = [];

    for (const branch of branches) {
      console.log(`🔍 [POWER] Checking branch: ${branch.name} (${branch.id})`);

      for (const provider of powerProviders) {
        // Check if power float account already exists for this branch and provider
        const existingAccount = await sql`
          SELECT id, provider, current_balance, is_active
          FROM float_accounts 
          WHERE branch_id = ${branch.id}
            AND account_type = 'power'
            AND provider = ${provider}
            AND is_active = true
        `;

        if (existingAccount.length === 0) {
          // Create the power float account
          console.log(
            `🔧 [POWER] Creating ${provider} power float account for branch: ${branch.name}`
          );

          const newAccount = await sql`
            INSERT INTO float_accounts (
              id,
              branch_id,
              account_type,
              provider,
              account_number,
              current_balance,
              min_threshold,
              max_threshold,
              is_active,
              notes,
              created_by,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              ${branch.id},
              'power',
              ${provider},
              ${`${provider.toUpperCase()}-${branch.name
                .replace(/\s+/g, "-")
                .toUpperCase()}-${Date.now()}`},
              0,
              1000,
              50000,
              true,
              ${`Power float account for ${provider} - ${branch.name}`},
              '00000000-0000-0000-0000-000000000000',
              NOW(),
              NOW()
            )
            RETURNING id, provider, account_number, current_balance
          `;

          createdAccounts.push({
            branch: branch.name,
            provider,
            accountId: newAccount[0].id,
            accountNumber: newAccount[0].account_number,
            balance: newAccount[0].current_balance,
          });

          console.log(
            `✅ [POWER] Created ${provider} power float account for ${branch.name}`
          );
        } else {
          console.log(
            `ℹ️ [POWER] ${provider} power float account already exists for ${branch.name}`
          );
        }
      }
    }

    // Get summary of all power float accounts
    const allPowerAccounts = await sql`
      SELECT 
        fa.id,
        fa.provider,
        fa.account_number,
        fa.current_balance,
        fa.is_active,
        b.name as branch_name
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.account_type = 'power'
      ORDER BY b.name, fa.provider
    `;

    return NextResponse.json({
      success: true,
      message: `Power float accounts ensured for all branches`,
      createdAccounts,
      totalPowerAccounts: allPowerAccounts.length,
      allPowerAccounts,
    });
  } catch (error) {
    console.error("❌ [POWER] Error ensuring power float accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to ensure power float accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
