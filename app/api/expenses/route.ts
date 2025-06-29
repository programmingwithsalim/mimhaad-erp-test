import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const status = searchParams.get("status")
    const limit = searchParams.get("limit") || "50"

    // Get expenses with expense head information (using first_name/last_name instead of username)
    let expenses
    if (branchId && status) {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        WHERE e.branch_id = ${branchId} AND e.status = ${status}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `
    } else if (branchId) {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        WHERE e.branch_id = ${branchId}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `
    } else if (status) {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        WHERE e.status = ${status}
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `
    } else {
      expenses = await sql`
        SELECT 
          e.*,
          eh.name as expense_head_name,
          eh.category as expense_head_category,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as created_by_name,
          CONCAT(COALESCE(approver.first_name, ''), ' ', COALESCE(approver.last_name, '')) as approved_by_name
        FROM expenses e
        LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users approver ON e.approved_by = approver.id
        ORDER BY e.created_at DESC
        LIMIT ${Number.parseInt(limit)}
      `
    }

    // Get summary statistics
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
      ${branchId ? sql`WHERE branch_id = ${branchId}` : sql``}
    `

    const statsResult = stats[0] || {}

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
    })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch expenses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      expense_head_id,
      amount,
      description,
      expense_date,
      payment_source = "cash",
      notes,
      branch_id,
      created_by = "550e8400-e29b-41d4-a716-446655440000", // Default UUID instead of "system"
    } = body

    // Validate required fields
    if (!expense_head_id || !amount || !expense_date || !branch_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: expense_head_id, amount, expense_date, branch_id" },
        { status: 400 },
      )
    }

    // Generate reference number
    const referenceNumber = `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Insert new expense (removed receipt_number field)
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
        ${branch_id}::UUID,
        ${created_by}::UUID,
        'pending'
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      expense: result[0],
      message: "Expense created successfully",
    })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
