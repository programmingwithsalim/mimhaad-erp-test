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



    // Build the main query using GL system with proper conditional logic
    let whereConditions: string[] = [];
    let queryParams: any[] = [];

    // Base condition
    whereConditions.push("gm.float_account_id = $1");
    queryParams.push(accountId);

    if (type) {
      whereConditions.push("gt.source_transaction_type = $2");
      queryParams.push(type);
    }

    if (startDate) {
      whereConditions.push("gt.date >= $" + (queryParams.length + 1));
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push("gt.date <= $" + (queryParams.length + 1));
      queryParams.push(endDate);
    }

    // Add branch filter for non-admin users
    if (session.user.role !== "Admin" && session.user.branchId) {
      whereConditions.push("gt.branch_id = $" + (queryParams.length + 1));
      queryParams.push(session.user.branchId);
    }

    // Build the complete query
    let queryString = `
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
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY gt.date DESC, gt.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const transactions = await sql.unsafe(queryString, ...queryParams);

    // Get total count for pagination
    let countWhereConditions: string[] = [];
    let countParams: any[] = [];

    // Base condition for count query
    countWhereConditions.push("gm.float_account_id = $1");
    countParams.push(accountId);

    if (type) {
      countWhereConditions.push("gt.source_transaction_type = $2");
      countParams.push(type);
    }

    if (startDate) {
      countWhereConditions.push("gt.date >= $" + (countParams.length + 1));
      countParams.push(startDate);
    }

    if (endDate) {
      countWhereConditions.push("gt.date <= $" + (countParams.length + 1));
      countParams.push(endDate);
    }

    if (session.user.role !== "Admin" && session.user.branchId) {
      countWhereConditions.push("gt.branch_id = $" + (countParams.length + 1));
      countParams.push(session.user.branchId);
    }

    // Build the count query
    let countQueryString = `
      SELECT COUNT(*) as total
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      JOIN float_accounts fa ON gm.float_account_id = fa.id
      WHERE ${countWhereConditions.join(' AND ')}
    `;

    const countResult = await sql.unsafe(countQueryString, ...countParams);
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
