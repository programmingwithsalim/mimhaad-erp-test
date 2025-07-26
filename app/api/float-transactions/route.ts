import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getDatabaseSession } from "@/lib/database-session-service";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const session = await getDatabaseSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    // Build the main query using GL system with simple template literals
    let transactions;

    // Simplified query without problematic gl_mappings join
    transactions = await sql`
      SELECT 
        gt.id,
        gt.date as transaction_date,
        gt.source_module,
        gt.source_transaction_type as type,
        gt.source_transaction_id as reference_id,
        gt.amount,
        gt.description,
        gt.status,
        gt.reference,
        gt.created_at,
        gt.branch_id,
        gt.branch_name,
        'main' as mapping_type,
        'float' as float_account_type,
        'system' as float_account_provider,
        'N/A' as float_account_number,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM gl_transactions gt
      LEFT JOIN users u ON gt.created_by = u.id
      WHERE gt.source_transaction_type IN (
        SELECT DISTINCT transaction_type 
        FROM gl_mappings 
        WHERE float_account_id = ${accountId}::uuid
      )
      ${type ? sql`AND gt.source_transaction_type = ${type}` : sql``}
      ${startDate ? sql`AND gt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND gt.date <= ${endDate}` : sql``}
      ${session.user.role !== "Admin" && session.user.branchId ? sql`AND gt.branch_id = ${session.user.branchId}::uuid` : sql``}
      ORDER BY gt.date DESC, gt.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination using simplified query
    let countResult = await sql`
      SELECT COUNT(*) as total
      FROM gl_transactions gt
      WHERE gt.source_transaction_type IN (
        SELECT DISTINCT transaction_type 
        FROM gl_mappings 
        WHERE float_account_id = ${accountId}::uuid
      )
      ${type ? sql`AND gt.source_transaction_type = ${type}` : sql``}
      ${startDate ? sql`AND gt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND gt.date <= ${endDate}` : sql``}
      ${session.user.role !== "Admin" && session.user.branchId ? sql`AND gt.branch_id = ${session.user.branchId}::uuid` : sql``}
    `;
    const total = countResult[0]?.total || 0;

    // Get float account details
    const floatAccountDetails = await sql`
      SELECT 
        id,
        account_type,
        provider,
        account_number,
        current_balance,
        account_name
      FROM float_accounts 
      WHERE id = ${accountId}
    `;

    return NextResponse.json({
      success: true,
      data: {
        floatAccount: floatAccountDetails[0] || null,
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching float transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transaction history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
