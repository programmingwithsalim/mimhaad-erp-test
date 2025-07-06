import { type NextRequest, NextResponse } from "next/server";
import { UnifiedTransactionService } from "@/lib/services/unified-transaction-service";
import { getCurrentUser } from "@/lib/auth-utils";

// GET - Get specific transaction
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    console.log("GET request for transaction ID:", transactionId);

    const transaction = await UnifiedTransactionService.getTransactionById(
      transactionId,
      "jumia"
    );

    if (!transaction) {
      console.log("Transaction not found with ID:", transactionId);
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    console.log("Found transaction:", transaction);
    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error getting Jumia transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    const body = await request.json();
    const currentUser = getCurrentUser(request as any);

    if (!currentUser?.id || !currentUser?.branchId) {
      return NextResponse.json(
        { success: false, error: "User authentication required" },
        { status: 401 }
      );
    }

    console.log(
      "PUT request for transaction ID:",
      transactionId,
      "with data:",
      body
    );

    const result = await UnifiedTransactionService.editTransaction(
      transactionId,
      "jumia",
      body,
      currentUser.id,
      currentUser.branchId,
      currentUser.name || currentUser.username
    );

    if (result.success) {
      console.log("Updated transaction:", result.transaction);
      return NextResponse.json({
        success: true,
        data: result.transaction,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating Jumia transaction:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    const body = await request.json();
    const currentUser = getCurrentUser(request as any);
    const reason = body?.reason || "User requested deletion";

    if (!currentUser?.id || !currentUser?.branchId) {
      return NextResponse.json(
        { success: false, error: "User authentication required" },
        { status: 401 }
      );
    }

    console.log("DELETE request for transaction ID:", transactionId);

    const result = await UnifiedTransactionService.deleteTransaction(
      transactionId,
      "jumia",
      reason,
      currentUser.id,
      currentUser.branchId,
      currentUser.name || currentUser.username
    );

    if (result.success) {
      console.log("Deleted transaction successfully");
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting Jumia transaction:", error);

    const transactionId = params.id;
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found",
          details: `Transaction with ID ${transactionId} does not exist`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
