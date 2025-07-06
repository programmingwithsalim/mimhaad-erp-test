import { type NextRequest, NextResponse } from "next/server";
import {
  createJumiaTransaction,
  getJumiaTransactions,
  getAllJumiaTransactions,
} from "@/lib/jumia-service";
import { TransactionService } from "@/lib/services/transaction-service-unified";

// Helper function to generate unique transaction ID
function generateTransactionId(type: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const prefix = type.toUpperCase().substring(0, 3);
  return `${prefix}_${timestamp}_${random}`;
}

// GET - Get transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");

    console.log(
      "GET transactions request - branchId:",
      branchId,
      "limit:",
      limit
    );

    let transactions;
    if (branchId) {
      transactions = await getJumiaTransactions(branchId, limit);
    } else {
      transactions = await getAllJumiaTransactions(limit);
    }

    console.log(`Returning ${transactions.length} transactions`);

    return NextResponse.json({
      success: true,
      data: transactions,
      total: transactions.length,
    });
  } catch (error) {
    console.error("Error getting Jumia transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create transaction
export async function POST(request: NextRequest) {
  try {
    const transactionData = await request.json();
    console.log("POST transaction request:", transactionData);

    // Generate unique transaction ID based on type
    const transactionId = generateTransactionId(
      transactionData.transaction_type || "JUMIA"
    );

    // 1. Create the Jumia transaction (handles all GL posting via unified service)
    const newTransaction = await createJumiaTransaction({
      ...transactionData,
      transaction_id: transactionId,
    });

    console.log("Created new transaction:", newTransaction);

    return NextResponse.json({
      success: true,
      data: newTransaction,
    });
  } catch (error) {
    console.error("Error creating Jumia transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Edit transaction
export async function PUT(request: NextRequest) {
  try {
    const { transaction_id, updateData } = await request.json();
    if (!transaction_id || !updateData) {
      return NextResponse.json(
        { success: false, error: "Missing transaction_id or updateData" },
        { status: 400 }
      );
    }
    const updated = await (
      await import("@/lib/jumia-service")
    ).updateJumiaTransaction(transaction_id, updateData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const { transaction_id } = await request.json();
    if (!transaction_id) {
      return NextResponse.json(
        { success: false, error: "Missing transaction_id" },
        { status: 400 }
      );
    }
    const deleted = await (
      await import("@/lib/jumia-service")
    ).deleteJumiaTransaction(transaction_id);
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
