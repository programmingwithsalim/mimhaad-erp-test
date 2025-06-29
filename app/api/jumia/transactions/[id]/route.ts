import { type NextRequest, NextResponse } from "next/server"
import { getJumiaTransactionById, updateJumiaTransaction, deleteJumiaTransaction } from "@/lib/jumia-service"

// GET - Get specific transaction
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id
    console.log("GET request for transaction ID:", transactionId)

    const transaction = await getJumiaTransactionById(transactionId)

    if (!transaction) {
      console.log("Transaction not found with ID:", transactionId)
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    console.log("Found transaction:", transaction)
    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error("Error getting Jumia transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT - Update transaction
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id
    const updateData = await request.json()

    console.log("PUT request for transaction ID:", transactionId, "with data:", updateData)

    const updatedTransaction = await updateJumiaTransaction(transactionId, updateData)

    console.log("Updated transaction:", updatedTransaction)
    return NextResponse.json({
      success: true,
      data: updatedTransaction,
    })
  } catch (error) {
    console.error("Error updating Jumia transaction:", error)

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Delete transaction
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id

    console.log("DELETE request for transaction ID:", transactionId)

    const deletedTransaction = await deleteJumiaTransaction(transactionId)

    console.log("Deleted transaction:", deletedTransaction)

    return NextResponse.json({
      success: true,
      data: deletedTransaction,
      message: "Transaction deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting Jumia transaction:", error)

    const transactionId = params.id
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found",
          details: `Transaction with ID ${transactionId} does not exist`,
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
