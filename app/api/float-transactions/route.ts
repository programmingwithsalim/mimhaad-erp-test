import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth-service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
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

    let query = sql`
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
      WHERE 1=1
    `;

    const params: any[] = [];

    if (accountId) {
      query = sql`${query} AND ft.account_id = ${accountId}`;
    }

    if (type) {
      query = sql`${query} AND ft.type = ${type}`;
    }

    if (startDate) {
      query = sql`${query} AND ft.created_at >= ${startDate}`;
    }

    if (endDate) {
      query = sql`${query} AND ft.created_at <= ${endDate}`;
    }

    // Add branch filter for non-admin users
    if (session.user.role !== "Admin" && session.user.branchId) {
      query = sql`${query} AND ft.branch_id = ${session.user.branchId}`;
    }

    query = sql`
      ${query}
      ORDER BY ft.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const transactions = await query;

    // Get total count for pagination
    let countQuery = sql`
      SELECT COUNT(*) as total
      FROM float_transactions ft
      WHERE 1=1
    `;

    if (accountId) {
      countQuery = sql`${countQuery} AND ft.account_id = ${accountId}`;
    }

    if (type) {
      countQuery = sql`${countQuery} AND ft.type = ${type}`;
    }

    if (startDate) {
      countQuery = sql`${countQuery} AND ft.created_at >= ${startDate}`;
    }

    if (endDate) {
      countQuery = sql`${countQuery} AND ft.created_at <= ${endDate}`;
    }

    if (session.user.role !== "Admin" && session.user.branchId) {
      countQuery = sql`${countQuery} AND ft.branch_id = ${session.user.branchId}`;
    }

    const countResult = await countQuery;
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
