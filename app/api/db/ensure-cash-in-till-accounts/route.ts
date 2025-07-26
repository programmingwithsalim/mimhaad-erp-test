import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [CASH-TILL] Ensuring cash-in-till accounts exist for all branches...");

    // Get all active branches
    const branches = await sql`
      SELECT id, name FROM branches WHERE is_active = true
    `;

    console.log(`🔍 [CASH-TILL] Found ${branches.length} active branches`);

    const createdAccounts = [];
    const existingAccounts = [];

    for (const branch of branches) {
      console.log(`🔍 [CASH-TILL] Checking branch: ${branch.name} (${branch.id})`);

      // Check if cash-in-till account already exists for this branch
      const existingAccount = await sql`
        SELECT id, current_balance, min_threshold, max_threshold, is_active
        FROM float_accounts 
        WHERE branch_id = ${branch.id}
          AND account_type = 'cash-in-till'
          AND is_active = true
      `;

      if (existingAccount.length === 0) {
        // Create the cash-in-till account
        console.log(`🔧 [CASH-TILL] Creating cash-in-till account for branch: ${branch.name}`);

        const newAccount = await sql`
          INSERT INTO float_accounts (
            id,
            branch_id,
            account_type,
            provider,
            account_name,
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
            'cash-in-till',
            'Cash',
            'Cash in Till',
            ${`CASH-TILL-${branch.name.replace(/\s+/g, "-").toUpperCase()}-${Date.now()}`},
            0,
            1000,
            50000,
            true,
            ${`Cash in till account for ${branch.name}`},
            '00000000-0000-0000-0000-000000000000',
            NOW(),
            NOW()
          )
          RETURNING id, account_name, account_number, current_balance, min_threshold, max_threshold
        `;

        createdAccounts.push({
          branch: branch.name,
          accountId: newAccount[0].id,
          accountName: newAccount[0].account_name,
          accountNumber: newAccount[0].account_number,
          balance: newAccount[0].current_balance,
          minThreshold: newAccount[0].min_threshold,
          maxThreshold: newAccount[0].max_threshold,
        });

        console.log(`✅ [CASH-TILL] Created cash-in-till account for ${branch.name}`);
      } else {
        const account = existingAccount[0];
        existingAccounts.push({
          branch: branch.name,
          accountId: account.id,
          balance: account.current_balance,
          minThreshold: account.min_threshold,
          maxThreshold: account.max_threshold,
        });
        console.log(`ℹ️ [CASH-TILL] Cash-in-till account already exists for ${branch.name}`);
      }
    }

    // Get summary of all cash-in-till accounts
    const allCashInTillAccounts = await sql`
      SELECT 
        fa.id,
        fa.account_name,
        fa.account_number,
        fa.current_balance,
        fa.min_threshold,
        fa.max_threshold,
        fa.is_active,
        b.name as branch_name
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.account_type = 'cash-in-till'
      ORDER BY b.name
    `;

    return NextResponse.json({
      success: true,
      message: `Cash-in-till accounts ensured for all branches`,
      createdAccounts,
      existingAccounts,
      totalCashInTillAccounts: allCashInTillAccounts.length,
      allCashInTillAccounts,
    });

  } catch (error) {
    console.error("❌ [CASH-TILL] Error ensuring cash-in-till accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to ensure cash-in-till accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 