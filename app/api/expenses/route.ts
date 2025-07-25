import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    console.log("Current user for expenses API:", currentUser);

    const { searchParams } = new URL(request.url);
    const requestedBranchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit") || "50";

    // Determine which branch to filter by based on user role
    let effectiveBranchId = requestedBranchId;

    // If user is not admin, enforce branch-specific access
    if (currentUser.role !== "admin") {
      // Non-admin users can only see their own branch
      effectiveBranchId = currentUser.branchId;
      console.log(
        `Non-admin user ${currentUser.name} (${currentUser.role}) - filtering by their branch: ${effectiveBranchId}`
      );
    } else if (requestedBranchId) {
      // Admin users can see specific branch if requested
      effectiveBranchId = requestedBranchId;
      console.log(
        `Admin user ${currentUser.name} - viewing specific branch: ${effectiveBranchId}`
      );
    } else {
      // Admin users without specific branch request see all branches
      effectiveBranchId = null;
      console.log(`Admin user ${currentUser.name} - viewing all branches`);
    }

    // Get expenses with expense head information
    let expenses;
    if (effectiveBranchId && status) {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name,
          b.name as branch_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE e.branch_id = ${effectiveBranchId} AND e.status = ${status}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `;
    } else if (effectiveBranchId) {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name,
          b.name as branch_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE e.branch_id = ${effectiveBranchId}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `;
    } else if (status) {
      // Admin viewing all branches with status filter
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name,
          b.name as branch_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE e.status = ${status}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `;
    } else {
      // Admin viewing all branches
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name,
          b.name as branch_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        LEFT JOIN branches b ON e.branch_id = b.id
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `;
    }

    // Get summary statistics with branch filtering
    const stats = await sql`
      SELECT 
        COUNT(*) as total_expenses,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
      FROM expenses 
      ${effectiveBranchId ? sql`WHERE branch_id = ${effectiveBranchId}` : sql``}
    `;

    const statsResult = stats[0] || {};

    return NextResponse.json({
      success: true,
      expenses: expenses || [],
      statistics: {
        total_expenses: Number.parseInt(statsResult.total_expenses || "0"),
        pending_count: Number.parseInt(statsResult.pending_count || "0"),
        approved_count: Number.parseInt(statsResult.approved_count || "0"),
        rejected_count: Number.parseInt(statsResult.rejected_count || "0"),
        paid_count: Number.parseInt(statsResult.paid_count || "0"),
        total_amount: Number.parseFloat(statsResult.total_amount || "0"),
        pending_amount: Number.parseFloat(statsResult.pending_amount || "0"),
        approved_amount: Number.parseFloat(statsResult.approved_amount || "0"),
        paid_amount: Number.parseFloat(statsResult.paid_amount || "0"),
      },
      userContext: {
        role: currentUser.role,
        branchId: currentUser.branchId,
        branchName: currentUser.branchName,
        canViewAllBranches: currentUser.role === "admin",
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch expenses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    console.log("Current user for expense creation:", currentUser);

    const body = await request.json();
    const {
      expense_head_id,
      amount,
      description,
      expense_date,
      payment_source = "cash",
      notes,
      branch_id,
      created_by = currentUser.id, // Use current user's ID
    } = body;

    // Validate required fields
    if (!expense_head_id || !amount || !expense_date) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: expense_head_id, amount, expense_date",
        },
        { status: 400 }
      );
    }

    // If payment_source is not 'cash', validate float account type
    if (payment_source && payment_source !== "cash") {
      const floatAccount =
        await sql`SELECT * FROM float_accounts WHERE id = ${payment_source}`;
      if (!floatAccount[0]) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid payment source (float account not found)",
          },
          { status: 400 }
        );
      }
      const type = floatAccount[0].account_type?.toLowerCase?.();
      if (["power", "e-zwich", "jumia"].includes(type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected payment source is not allowed for expenses.",
          },
          { status: 400 }
        );
      }
    }

    // Determine which branch to use based on user role
    let effectiveBranchId = branch_id;

    // If user is not admin, enforce their branch
    if (currentUser.role !== "admin") {
      effectiveBranchId = currentUser.branchId;
      console.log(
        `Non-admin user ${currentUser.name} - using their branch: ${effectiveBranchId}`
      );
    } else if (!branch_id) {
      // Admin must specify a branch
      return NextResponse.json(
        { success: false, error: "Branch ID is required for expense creation" },
        { status: 400 }
      );
    }

    // Generate reference number
    const referenceNumber = `EXP-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;

    // Insert new expense
    const result = await sql`
      INSERT INTO expenses (
        reference_number,
        expense_head_id,
        amount,
        description,
        expense_date,
        payment_source,
        notes,
        branch_id,
        created_by,
        status
      ) VALUES (
        ${referenceNumber},
        ${expense_head_id}::UUID,
        ${amount},
        ${description || null},
        ${expense_date},
        ${payment_source},
        ${notes || null},
        ${effectiveBranchId}::UUID,
        ${created_by}::UUID,
        'pending'
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      expense: result[0],
      message: "Expense created successfully",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
