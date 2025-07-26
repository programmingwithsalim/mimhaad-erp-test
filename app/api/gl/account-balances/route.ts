import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const branchId = searchParams.get("branchId");

    let query = `
      SELECT 
        id,
        account_id,
        current_balance,
        last_updated,
        branch_id,
        period_balances
      FROM gl_account_balances
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (accountId) {
      query += ` AND account_id = $${paramIndex++}`;
      params.push(accountId);
    }

    if (branchId) {
      query += ` AND branch_id = $${paramIndex++}`;
      params.push(branchId);
    }

    query += ` ORDER BY account_id`;

    const balances = await sql.unsafe(query, ...params);

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