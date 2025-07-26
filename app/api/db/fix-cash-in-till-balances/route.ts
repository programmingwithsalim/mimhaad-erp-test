import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔧 [CASH-TILL] Fixing cash-in-till balances for new branches..."
    );

    // Get all cash-in-till accounts
    const cashInTillAccounts = await sql`
      SELECT 
        fa.id,
        fa.branch_id,
        fa.current_balance,
        fa.created_at,
        b.name as branch_name
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.account_type = 'cash-in-till'
        AND fa.is_active = true
      ORDER BY fa.created_at DESC
    `;

    console.log(
      `🔍 [CASH-TILL] Found ${cashInTillAccounts.length} cash-in-till accounts`
    );

    const fixedAccounts = [];
    const skippedAccounts = [];

    for (const account of cashInTillAccounts) {
      const balance = Number(account.current_balance);
      const createdAt = new Date(account.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If account was created recently (within last 7 days) and has non-zero balance
      // and no transactions have been made, reset to zero
      if (daysSinceCreation <= 7 && balance > 0) {
        // Check if there are any transactions for this account
        const transactions = await sql`
          SELECT COUNT(*) as transaction_count
          FROM (
            SELECT id FROM momo_transactions WHERE float_account_id = ${account.id}
            UNION ALL
            SELECT id FROM agency_banking_transactions WHERE float_account_id = ${account.id}
            UNION ALL
            SELECT id FROM power_transactions WHERE float_account_id = ${account.id}
            UNION ALL
            SELECT id FROM e_zwich_transactions WHERE float_account_id = ${account.id}
            UNION ALL
            SELECT id FROM jumia_transactions WHERE float_account_id = ${account.id}
            UNION ALL
            SELECT id FROM float_transactions WHERE float_account_id = ${account.id}
          ) all_transactions
        `;

        const transactionCount = Number(
          transactions[0]?.transaction_count || 0
        );

        if (transactionCount === 0) {
          // Reset balance to zero
          await sql`
            UPDATE float_accounts
            SET current_balance = 0,
                updated_at = NOW()
            WHERE id = ${account.id}
          `;

          fixedAccounts.push({
            branch: account.branch_name,
            accountId: account.id,
            oldBalance: balance,
            newBalance: 0,
            daysSinceCreation,
            transactionCount,
          });

          console.log(
            `✅ [CASH-TILL] Reset ${account.branch_name} cash-in-till from ${balance} to 0`
          );
        } else {
          skippedAccounts.push({
            branch: account.branch_name,
            accountId: account.id,
            balance,
            daysSinceCreation,
            transactionCount,
            reason: "Has transactions",
          });
        }
      } else {
        skippedAccounts.push({
          branch: account.branch_name,
          accountId: account.id,
          balance,
          daysSinceCreation,
          reason: balance === 0 ? "Already zero" : "Older than 7 days",
        });
      }
    }

    // Get updated summary
    const updatedAccounts = await sql`
      SELECT 
        fa.id,
        fa.branch_id,
        fa.current_balance,
        b.name as branch_name
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.account_type = 'cash-in-till'
        AND fa.is_active = true
      ORDER BY fa.current_balance DESC
    `;

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedAccounts.length} cash-in-till accounts`,
      fixedAccounts,
      skippedAccounts,
      totalAccounts: updatedAccounts.length,
      updatedAccounts,
    });
  } catch (error) {
    console.error("❌ [CASH-TILL] Error fixing cash-in-till balances:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix cash-in-till balances",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
