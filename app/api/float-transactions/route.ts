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



    // Build the main query using GL system with proper template literals
    let baseQuery = sql`
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
        gm.mapping_type,
        fa.account_type as float_account_type,
        fa.provider as float_account_provider,
        fa.account_number as float_account_number,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      JOIN float_accounts fa ON gm.float_account_id = fa.id
      LEFT JOIN users u ON gt.created_by = u.id
      WHERE gm.float_account_id = ${accountId}
    `;

    // Add additional conditions
    if (type) {
      baseQuery = sql`${baseQuery} AND gt.source_transaction_type = ${type}`;
    }

    if (startDate) {
      baseQuery = sql`${baseQuery} AND gt.date >= ${startDate}`;
    }

    if (endDate) {
      baseQuery = sql`${baseQuery} AND gt.date <= ${endDate}`;
    }

    // Add branch filter for non-admin users
    if (session.user.role !== "Admin" && session.user.branchId) {
      baseQuery = sql`${baseQuery} AND gt.branch_id = ${session.user.branchId}`;
    }

    // Add ORDER BY, LIMIT, and OFFSET
    baseQuery = sql`${baseQuery} ORDER BY gt.date DESC, gt.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const transactions = await baseQuery;

    // Get total count for pagination using template literals
    let countQuery = sql`
      SELECT COUNT(*) as total
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      JOIN float_accounts fa ON gm.float_account_id = fa.id
      WHERE gm.float_account_id = ${accountId}
    `;

    // Add additional conditions for count query
    if (type) {
      countQuery = sql`${countQuery} AND gt.source_transaction_type = ${type}`;
    }

    if (startDate) {
      countQuery = sql`${countQuery} AND gt.date >= ${startDate}`;
    }

    if (endDate) {
      countQuery = sql`${countQuery} AND gt.date <= ${endDate}`;
    }

    if (session.user.role !== "Admin" && session.user.branchId) {
      countQuery = sql`${countQuery} AND gt.branch_id = ${session.user.branchId}`;
    }

    const countResult = await countQuery;
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
