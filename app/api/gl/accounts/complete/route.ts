import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request) {
  try {
    // Parse pagination params
    const url = request?.nextUrl || request?.url || {};
    const searchParams =
      url.searchParams || new URL(url, "http://localhost").searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const offset = (page - 1) * pageSize;

    // Get total count
    const totalResult =
      await sql`SELECT COUNT(*) AS total FROM gl_accounts WHERE is_active = true`;
    const total_accounts = Number(totalResult[0]?.total || 0);

    // Join gl_accounts with gl_account_balances to get all account info and balances, paginated
    const accountsWithBalances = await sql`
      SELECT 
        a.id,
        a.code AS account_code,
        a.name AS account_name,
        a.type AS account_type,
        a.is_active,
        a.created_at,
        a.updated_at,
        b.current_balance AS balance,
        b.last_updated
      FROM gl_accounts a
      LEFT JOIN gl_account_balances b ON a.id = b.account_id::uuid
      WHERE a.is_active = true
      ORDER BY a.code
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      accounts: accountsWithBalances,
      total_accounts,
      page,
      pageSize,
      totalPages: Math.ceil(total_accounts / pageSize),
    });
  } catch (error) {
    console.error("Error fetching GL accounts from database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch GL accounts from database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
