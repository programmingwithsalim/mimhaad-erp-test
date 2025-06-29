import { NextResponse } from "next/server"
import { getExpenseById, updateExpense, deleteExpense } from "@/lib/expense-database-service"
import { revalidatePath } from "next/cache"

// Helper function to validate UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("GET /api/expenses/[id] - Fetching expense with ID:", params.id)

    const { id } = params

    // Validate UUID format first
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 },
      )
    }

    const expense = await getExpenseById(id)

    console.log("Fetched expense:", expense)

    if (!expense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error("Error in GET /api/expenses/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("PATCH /api/expenses/[id] - Updating expense with ID:", params.id)

    const { id } = params

    // Validate UUID format first
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 },
      )
    }

    const data = await request.json()

    console.log("Update data received:", data)

    // Validate data (example: check if amount is a number)
    if (data.amount && typeof data.amount !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a number",
        },
        { status: 400 },
      )
    }

    // Update the expense
    const updatedExpenseData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    console.log("Calling updateExpense with:", updatedExpenseData)
    const updatedExpense = await updateExpense(id, updatedExpenseData)

    if (!updatedExpense) {
      return NextResponse.json(
        {
          success: false,
          error: "Expense not found or update failed",
        },
        { status: 404 },
      )
    }

    console.log("Updated expense:", updatedExpense)

    // If the expense is being marked as paid, create GL entries
    if (data.status === "paid") {
      try {
        // Import the GL integration module
        const { createGLEntriesForExpense } = await import("../../../../lib/gl-integration")

        // Get the updated expense
        const expense = await getExpenseById(id)

        if (expense) {
          // Create GL entries
          await createGLEntriesForExpense(expense)
          console.log("GL entries created for Expense:", id)
        }
      } catch (glError) {
        console.error("Error creating GL entries for Expense:", glError)
        // We don't want to fail the expense update if GL entry creation fails
        // But we should log it for later reconciliation
      }
    }

    revalidatePath("/dashboard/expenses")

    // Return response
    return NextResponse.json({
      success: true,
      expense: updatedExpense,
    })
  } catch (error) {
    console.error("Error in PATCH /api/expenses/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("DELETE /api/expenses/[id] - Deleting expense with ID:", params.id)

    const { id } = params

    // Validate ID format (basic check)
    if (!id || id.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID",
        },
        { status: 400 },
      )
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      console.error("Invalid UUID format:", id)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expense ID format",
        },
        { status: 400 },
      )
    }

    console.log("Attempting to delete expense:", id)

    // Delete the expense directly
    const success = await deleteExpense(id)

    if (!success) {
      console.error("Failed to delete expense:", id)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete expense - expense may not exist",
        },
        { status: 404 },
      )
    }

    console.log("Expense deleted successfully:", id)

    // Revalidate the expenses page
    revalidatePath("/dashboard/expenses")

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    })
  } catch (error) {
    console.error("Error in DELETE /api/expenses/[id]:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete expense",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
