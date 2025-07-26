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

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (accountId) {
      whereConditions.push(`ft.account_id = $${paramIndex++}`);
      params.push(accountId);
    }

    if (type) {
      whereConditions.push(`ft.type = $${paramIndex++}`);
      params.push(type);
    }

    if (startDate) {
      whereConditions.push(`ft.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`ft.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    // Add branch filter for non-admin users (filter by float account branch instead)
    if (session.user.role !== "Admin" && session.user.branchId) {
      whereConditions.push(`fa.branch_id = $${paramIndex++}`);
      params.push(session.user.branchId);
    }

    // Build the query with proper parameter substitution
    let queryString = `
      SELECT 
        ft.id,
        ft.account_id,
        ft.type,
        ft.amount,
        ft.balance_before,
        ft.balance_after,
        ft.description,
        ft.created_at,
        ft.reference,
        ft.recharge_method,
        fa.provider,
        fa.account_type,
        u.name as created_by_name
      FROM float_transactions ft
      LEFT JOIN float_accounts fa ON ft.account_id = fa.id
      LEFT JOIN users u ON ft.created_by = u.id
    `;

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      queryString += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY, LIMIT, and OFFSET
    queryString += ` ORDER BY ft.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    // Execute the query using the neon client directly
    const transactions = await sql(queryString, ...params);

    // Get total count for pagination
    let countWhereConditions: string[] = [];
    let countParams: any[] = [];
    let countParamIndex = 1;

    if (accountId) {
      countWhereConditions.push(`ft.account_id = $${countParamIndex++}`);
      countParams.push(accountId);
    }

    if (type) {
      countWhereConditions.push(`ft.type = $${countParamIndex++}`);
      countParams.push(type);
    }

    if (startDate) {
      countWhereConditions.push(`ft.created_at >= $${countParamIndex++}`);
      countParams.push(startDate);
    }

    if (endDate) {
      countWhereConditions.push(`ft.created_at <= $${countParamIndex++}`);
      countParams.push(endDate);
    }

    if (session.user.role !== "Admin" && session.user.branchId) {
      countWhereConditions.push(`fa.branch_id = $${countParamIndex++}`);
      countParams.push(session.user.branchId);
    }

    // Build the count query with proper parameter substitution
    let countQueryString = `
      SELECT COUNT(*) as total
      FROM float_transactions ft
      LEFT JOIN float_accounts fa ON ft.account_id = fa.id
    `;

    // Add WHERE clause if conditions exist
    if (countWhereConditions.length > 0) {
      countQueryString += ` WHERE ${countWhereConditions.join(' AND ')}`;
    }

    // Execute the count query using the neon client directly
    const countResult = await sql(countQueryString, ...countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
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
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
