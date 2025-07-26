import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getDatabaseSession } from "@/lib/database-session-service";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDatabaseSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: floatAccountId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get float account details
    const floatAccount = await sql`
      SELECT 
        id,
        account_type,
        provider,
        account_number,
        current_balance,
        account_name,
        branch_id,
        created_at
      FROM float_accounts 
      WHERE id = ${floatAccountId} AND is_active = true
    `;

    if (floatAccount.length === 0) {
      return NextResponse.json(
        { error: "Float account not found" },
        { status: 404 }
      );
    }

    const account = floatAccount[0];

    // Check branch access for non-admin users
    if (
      session.user.role !== "Admin" &&
      session.user.branchId !== account.branch_id
    ) {
      return NextResponse.json(
        { error: "Access denied to this float account" },
        { status: 403 }
      );
    }

    // Build the comprehensive GL-based query
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Base condition: filter by float account through GL mappings
    whereConditions.push(`gm.float_account_id = $${paramIndex++}`);
    queryParams.push(floatAccountId);

    if (startDate) {
      whereConditions.push(`gt.date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`gt.date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    // Add branch filter for non-admin users
    if (session.user.role !== "Admin" && session.user.branchId) {
      whereConditions.push(`gt.branch_id = $${paramIndex++}`);
      queryParams.push(session.user.branchId);
    }

    // Build the main query using GL system
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
        u.first_name || ' ' || u.last_name as created_by_name,
        -- Additional context based on source module
        CASE 
          WHEN gt.source_module = 'momo' THEN (
            SELECT mt.customer_name || ' (' || mt.phone_number || ')'
            FROM momo_transactions mt 
            WHERE mt.id::text = gt.source_transaction_id
            LIMIT 1
          )
          WHEN gt.source_module = 'power' THEN (
            SELECT pt.customer_name || ' (' || pt.meter_number || ')'
            FROM power_transactions pt 
            WHERE pt.id::text = gt.source_transaction_id
            LIMIT 1
          )
          WHEN gt.source_module = 'jumia' THEN (
            SELECT jt.customer_name || ' (' || jt.tracking_id || ')'
            FROM jumia_transactions jt 
            WHERE jt.id::text = gt.source_transaction_id
            LIMIT 1
          )
          WHEN gt.source_module = 'expenses' THEN (
            SELECT eh.name || ' - ' || e.reference_number
            FROM expenses e
            JOIN expense_heads eh ON e.expense_head_id = eh.id
            WHERE e.id::text = gt.source_transaction_id
            LIMIT 1
          )
          WHEN gt.source_module = 'agency_banking' THEN (
            SELECT abt.customer_name || ' (' || abt.account_number || ')'
            FROM agency_banking_transactions abt 
            WHERE abt.id::text = gt.source_transaction_id
            LIMIT 1
          )
          ELSE gt.description
        END as transaction_details
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      LEFT JOIN users u ON gt.created_by::uuid = u.id
      WHERE ${whereConditions.join(" AND ")}
    `;

    // Add ORDER BY, LIMIT, and OFFSET
    queryString += ` ORDER BY gt.date DESC, gt.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const transactions = await sql(queryString, ...queryParams);

    // Get total count for pagination
    let countWhereConditions: string[] = [];
    let countParams: any[] = [];
    let countParamIndex = 1;

    // Base condition for count query
    countWhereConditions.push(`gm.float_account_id = $${countParamIndex++}`);
    countParams.push(floatAccountId);

    if (startDate) {
      countWhereConditions.push(`gt.date >= $${countParamIndex++}`);
      countParams.push(startDate);
    }

    if (endDate) {
      countWhereConditions.push(`gt.date <= $${countParamIndex++}`);
      countParams.push(endDate);
    }

    if (session.user.role !== "Admin" && session.user.branchId) {
      countWhereConditions.push(`gt.branch_id = $${countParamIndex++}`);
      countParams.push(session.user.branchId);
    }

    // Build the count query
    let countQueryString = `
      SELECT COUNT(*) as total
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      WHERE ${countWhereConditions.join(" AND ")}
    `;

    const countResult = await sql(countQueryString, ...countParams);
    const total = countResult[0]?.total || 0;

    // Get summary statistics
    const summaryStats = await sql`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN gt.amount > 0 THEN gt.amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN gt.amount < 0 THEN ABS(gt.amount) ELSE 0 END) as total_credits,
        COUNT(DISTINCT gt.source_module) as modules_involved
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      WHERE gm.float_account_id = ${floatAccountId}
      ${startDate ? sql`AND gt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND gt.date <= ${endDate}` : sql``}
      ${
        session.user.role !== "Admin" && session.user.branchId
          ? sql`AND gt.branch_id = ${session.user.branchId}`
          : sql``
      }
    `;

    // Get transactions by module
    const moduleBreakdown = await sql`
      SELECT 
        gt.source_module,
        COUNT(*) as transaction_count,
        SUM(gt.amount) as total_amount
      FROM gl_transactions gt
      JOIN gl_mappings gm ON gt.source_transaction_type = gm.transaction_type
      WHERE gm.float_account_id = ${floatAccountId}
      ${startDate ? sql`AND gt.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND gt.date <= ${endDate}` : sql``}
      ${
        session.user.role !== "Admin" && session.user.branchId
          ? sql`AND gt.branch_id = ${session.user.branchId}`
          : sql``
      }
      GROUP BY gt.source_module
      ORDER BY transaction_count DESC
    `;

    return NextResponse.json({
      success: true,
      data: {
        floatAccount: {
          id: account.id,
          accountType: account.account_type,
          provider: account.provider,
          accountNumber: account.account_number,
          currentBalance: Number(account.current_balance),
          accountName: account.account_name,
          branchId: account.branch_id,
          createdAt: account.created_at,
        },
        summary: {
          totalTransactions: Number(summaryStats[0]?.total_transactions || 0),
          totalDebits: Number(summaryStats[0]?.total_debits || 0),
          totalCredits: Number(summaryStats[0]?.total_credits || 0),
          modulesInvolved: Number(summaryStats[0]?.modules_involved || 0),
          netMovement:
            Number(summaryStats[0]?.total_debits || 0) -
            Number(summaryStats[0]?.total_credits || 0),
        },
        moduleBreakdown: moduleBreakdown.map((module) => ({
          module: module.source_module,
          transactionCount: Number(module.transaction_count),
          totalAmount: Number(module.total_amount),
        })),
        transactions: transactions.map((tx) => ({
          id: tx.id,
          transactionDate: tx.transaction_date,
          sourceModule: tx.source_module,
          type: tx.type,
          referenceId: tx.reference_id,
          amount: Number(tx.amount),
          description: tx.description,
          status: tx.status,
          reference: tx.reference,
          createdAt: tx.created_at,
          branchId: tx.branch_id,
          branchName: tx.branch_name,
          mappingType: tx.mapping_type,
          createdByName: tx.created_by_name,
          transactionDetails: tx.transaction_details,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching float account statement:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch float account statement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
