import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getDatabaseSession } from "@/lib/database-session-service";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const session = await getDatabaseSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const branchId = searchParams.get("branchId");

    let balances: any[] = [];

    if (accountId && branchId) {
      balances = await sql`
        SELECT 
          id,
          account_id,
          current_balance,
          last_updated,
          branch_id,
          period_balances
        FROM gl_account_balances
        WHERE account_id = ${accountId}
        AND branch_id = ${branchId}::uuid
        ORDER BY account_id
      `;
    } else if (accountId) {
      balances = await sql`
        SELECT 
          id,
          account_id,
          current_balance,
          last_updated,
          branch_id,
          period_balances
        FROM gl_account_balances
        WHERE account_id = ${accountId}
        ORDER BY account_id
      `;
    } else if (branchId) {
      balances = await sql`
        SELECT 
          id,
          account_id,
          current_balance,
          last_updated,
          branch_id,
          period_balances
        FROM gl_account_balances
        WHERE branch_id = ${branchId}::uuid
        ORDER BY account_id
      `;
    } else {
      balances = await sql`
        SELECT 
          id,
          account_id,
          current_balance,
          last_updated,
          branch_id,
          period_balances
        FROM gl_account_balances
        ORDER BY account_id
      `;
    }

    return NextResponse.json({
      success: true,
      data: balances,
      count: balances.length
    });

  } catch (error) {
    console.error("Error fetching GL account balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch GL account balances" },
      { status: 500 }
    );
  }
} 