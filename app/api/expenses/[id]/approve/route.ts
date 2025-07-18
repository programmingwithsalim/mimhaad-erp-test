import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

const sql = neon(process.env.DATABASE_URL!);

// Helper function to map payment methods to GL transaction types
function getExpenseTransactionType(paymentMethod: string): string {
  switch (paymentMethod?.toLowerCase()) {
    case "cash":
      return "expense_cash";
    case "bank":
    case "bank transfer":
      return "expense_bank";
    case "card":
    case "credit card":
    case "debit card":
      return "expense_card";
    case "momo":
    case "mobile money":
      return "expense_momo";
    case "momo_mtn":
    case "mtn momo":
      return "expense_momo_mtn";
    case "momo_telecel":
    case "telecel momo":
      return "expense_momo_telecel";
    case "agency_gcb":
    case "gcb":
      return "expense_agency_gcb";
    case "agency_fidelity":
    case "fidelity":
      return "expense_agency_fidelity";
    case "agency_cal":
    case "cal bank":
      return "expense_bank"; // Uses Cal Bank agency account
    default:
      return "expense_cash"; // Default to cash instead of expense_other
  }
}

// Helper function to map expense head categories to GL mapping keys
function getGLCategoryFromExpenseHead(headCategory: string): string {
  switch ((headCategory || "").toLowerCase()) {
    case "operational":
      return "expense_operational";
    case "administrative":
      return "expense_administrative";
    case "financial":
      return "expense_financial";
    case "capital":
      return "expense_capital";
    case "marketing":
      return "expense_operational"; // Map marketing to operational
    case "security":
      return "expense_operational"; // Map security to operational
    case "human resources":
      return "expense_administrative"; // Map HR to administrative
    default:
      return "expense_operational"; // Default to operational (Cash in Till) instead of expense_other
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { approver_id, comments } = body;

    console.log("Approving expense:", id, "by:", approver_id);

    // First, get the expense details to determine GL mapping
    const expenseResult = await sql`
      SELECT e.*, eh.name as expense_head_name, b.name as branch_name
      FROM expenses e
      LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.id = ${id}
    `;

    if (expenseResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const expense = expenseResult[0];

    // Update the expense status using correct column name
    const result = await sql`
      UPDATE expenses 
      SET 
        status = 'approved',
        approved_by = ${approver_id},
        approved_at = CURRENT_TIMESTAMP,
        comments = ${comments || ""}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    // After updating the expense status, auto-debit the float account if payment_source is not 'cash'
    const paymentSource = expense.payment_source;
    const expenseAmount = Number(expense.amount);
    if (paymentSource && paymentSource !== "cash") {
      // Fetch the float account
      const floatAccountResult =
        await sql`SELECT * FROM float_accounts WHERE id = ${paymentSource}`;
      if (!floatAccountResult[0]) {
        return NextResponse.json(
          {
            success: false,
            error: "Float account for payment source not found.",
          },
          { status: 400 }
        );
      }
      const floatAccount = floatAccountResult[0];
      const currentBalance = Number(floatAccount.current_balance);
      if (currentBalance < expenseAmount) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient float account balance for this expense.",
          },
          { status: 400 }
        );
      }
      const newBalance = currentBalance - expenseAmount;
      // Update float account balance
      await sql`UPDATE float_accounts SET current_balance = ${newBalance}, updated_at = NOW() WHERE id = ${paymentSource}`;
      // Record float transaction
      await sql`INSERT INTO float_transactions (id, account_id, type, amount, balance_before, balance_after, description, created_by, branch_id, created_at) VALUES (gen_random_uuid(), ${paymentSource}, 'expense_debit', ${-expenseAmount}, ${currentBalance}, ${newBalance}, ${"Expense auto-debit on approval"}, ${approver_id}, ${
        expense.branch_id
      }, NOW())`;
    }

    // Post GL entries after approval
    const glResult = await UnifiedGLPostingService.createGLEntries({
      transactionId: id,
      sourceModule: "expenses",
      transactionType: getExpenseTransactionType(expense.payment_method), // Map payment method to GL transaction type
      amount: expense.amount,
      fee: 0, // No fees for expenses
      reference:
        expense.description ||
        `Expense - ${expense.expense_head_name || "General"}`,
      processedBy: approver_id,
      branchId: expense.branch_id,
      branchName: expense.branch_name,
      metadata: {
        expenseHead: expense.expense_head_name || "General",
        expenseHeadId: expense.expense_head_id,
        paymentMethod: expense.payment_method,
        expenseDate: expense.expense_date,
        expenseCategory: getGLCategoryFromExpenseHead(
          expense.expense_head_category
        ), // Use expense head category for GL mapping lookup
      },
    });

    if (!glResult.success) {
      console.error("Failed to create GL entries for expense:", glResult.error);
      // Note: We don't fail the approval if GL posting fails, but we log it
    }

    console.log(
      "Expense approved successfully:",
      id,
      "GL posted:",
      glResult.success
    );

    return NextResponse.json({
      success: true,
      message: "Expense approved successfully",
      expense: result[0],
      glPosted: glResult.success,
      glTransactionId: glResult.glTransactionId,
    });
  } catch (error) {
    console.error("Error approving expense:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to approve expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
