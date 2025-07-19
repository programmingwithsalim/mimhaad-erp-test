import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { neon } from "@neondatabase/serverless";
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "@/lib/expense-database-service";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

const sql = neon(process.env.DATABASE_URL!);

// Helper function to validate UUID
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    console.log(
      "GET /api/expenses/[id] - Fetching expense with ID:",
      (await params).id
    );

    const { id } = params;

    // Validate UUID format first
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 }
      );
    }

    const expense = await getExpenseById(id);

    console.log("Fetched expense:", expense);

    if (!expense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Error in GET /api/expenses/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    console.log(
      "PATCH /api/expenses/[id] - Updating expense with ID:",
      (await params).id
    );

    const { id } = params;

    // Validate UUID format first
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 }
      );
    }

    // First, get the current expense to check its status
    const currentExpense = await getExpenseById(id);
    if (!currentExpense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    // Check if expense is approved - if so, prevent editing
    if (currentExpense.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot edit approved expenses. Once an expense is approved, it cannot be modified.",
        },
        { status: 403 }
      );
    }

    const data = await request.json();

    console.log("Update data received:", data);

    // Validate data (example: check if amount is a number)
    if (data.amount && typeof data.amount !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a number",
        },
        { status: 400 }
      );
    }

    // Update the expense
    const updatedExpenseData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    console.log("Calling updateExpense with:", updatedExpenseData);
    const updatedExpense = await updateExpense(id, updatedExpenseData);

    if (!updatedExpense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found or update failed",
        },
        { status: 404 }
      );
    }

    console.log("Updated expense:", updatedExpense);

    // If the expense is being marked as paid, create GL entries
    if (data.status === "paid") {
      try {
        // Get the updated expense with full details for GL posting
        const expenseResult = await sql`
          SELECT e.*, eh.name as expense_head_name, eh.category as expense_head_category, b.name as branch_name
          FROM expenses e
          LEFT JOIN expense_heads eh ON e.expense_head_id = eh.id
          LEFT JOIN branches b ON e.branch_id = b.id
          WHERE e.id = ${id}
        `;

        if (expenseResult.length > 0) {
          const expense = expenseResult[0];

          // Create GL entries using UnifiedGLPostingService
          const glResult = await UnifiedGLPostingService.createGLEntries({
            transactionId: id,
            sourceModule: "expenses",
            transactionType: getExpenseTransactionType(expense.payment_source),
            amount: expense.amount,
            fee: 0, // No fees for expenses
            reference:
              expense.description ||
              `Expense - ${expense.expense_head_name || "General"}`,
            processedBy: expense.created_by,
            branchId: expense.branch_id,
            branchName: expense.branch_name,
            metadata: {
              expenseHead: expense.expense_head_name || "General",
              expenseHeadId: expense.expense_head_id,
              paymentMethod: expense.payment_source,
              expenseDate: expense.expense_date,
              expenseCategory: getGLCategoryFromExpenseHead(
                expense.expense_head_category
              ),
            },
          });

          if (glResult.success) {
            console.log("GL entries created for Expense:", id);
          } else {
            console.error(
              "Failed to create GL entries for Expense:",
              glResult.error
            );
          }
        }
      } catch (glError) {
        console.error("Error creating GL entries for Expense:", glError);
        // We don't want to fail the expense update if GL entry creation fails
        // But we should log it for later reconciliation
      }
    }

    revalidatePath("/dashboard/expenses");

    // Return response
    return NextResponse.json({
      success: true,
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Error in PATCH /api/expenses/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string  }> }
) {
  try {
    console.log(
      "DELETE /api/expenses/[id] - Deleting expense with ID:",
      (await params).id
    );

    const { id } = params;

    // Validate ID format (basic check)
    if (!id || id.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID",
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 }
      );
    }

    // First, get the current expense to check its status
    const currentExpense = await getExpenseById(id);
    if (!currentExpense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    // Check if expense is approved - if so, prevent deletion
    if (currentExpense.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete approved expenses. Once an expense is approved, it cannot be deleted.",
        },
        { status: 403 }
      );
    }

    console.log("Attempting to delete expense:", id);

    // Delete the expense directly
    const success = await deleteExpense(id);

    if (!success) {
      console.error("Failed to delete expense:", id);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete expense - expense may not exist",
        },
        { status: 404 }
      );
    }

    console.log("Expense deleted successfully:", id);

    // Revalidate the expenses page
    revalidatePath("/dashboard/expenses");

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/expenses/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
