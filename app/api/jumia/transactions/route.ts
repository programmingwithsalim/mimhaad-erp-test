import { type NextRequest, NextResponse } from "next/server"
import { createJumiaTransaction, getJumiaTransactions, getAllJumiaTransactions } from "@/lib/jumia-service"
import { TransactionService } from "@/lib/services/transaction-service-unified"
import {
  createJumiaPackageReceiptGLEntries,
  createJumiaPODCollectionGLEntries,
  createJumiaSettlementGLEntries,
} from "@/lib/services/jumia-gl-service"

// Helper function to generate unique transaction ID
function generateTransactionId(type: string): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const prefix = type.toUpperCase().substring(0, 3)
  return `${prefix}_${timestamp}_${random}`
}

// GET - Get transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    console.log("GET transactions request - branchId:", branchId, "limit:", limit)

    let transactions
    if (branchId) {
      transactions = await getJumiaTransactions(branchId, limit)
    } else {
      transactions = await getAllJumiaTransactions(limit)
    }

    console.log(`Returning ${transactions.length} transactions`)

    return NextResponse.json({
      success: true,
      data: transactions,
      total: transactions.length,
    })
  } catch (error) {
    console.error("Error getting Jumia transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST - Create transaction
export async function POST(request: NextRequest) {
  try {
    const transactionData = await request.json()
    console.log("POST transaction request:", transactionData)

    // Generate unique transaction ID based on type
    const transactionId = generateTransactionId(transactionData.transaction_type || "JUMIA")

    // 1. Create the Jumia transaction
    const newTransaction = await createJumiaTransaction({
      ...transactionData,
      transaction_id: transactionId,
    })

    console.log("Created new transaction:", newTransaction)

    // 2. Process GL entries based on transaction type
    let glEntry = null
    try {
      switch (transactionData.transaction_type) {
        case "package_receipt":
          glEntry = await createJumiaPackageReceiptGLEntries(
            transactionId,
            transactionData.tracking_id || "",
            transactionData.customer_name || "",
            transactionData.branch_id,
            transactionData.user_id,
            transactionData.user_id,
          )
          break

        case "pod_collection":
          glEntry = await createJumiaPODCollectionGLEntries(
            transactionId,
            Number(transactionData.amount || 0),
            transactionData.tracking_id || "",
            transactionData.customer_name || "",
            transactionData.branch_id,
            transactionData.user_id,
            transactionData.user_id,
          )
          break

        case "settlement":
          glEntry = await createJumiaSettlementGLEntries(
            transactionId,
            Number(transactionData.amount || 0),
            transactionData.settlement_reference || "",
            transactionData.branch_id,
            transactionData.user_id,
            transactionData.user_id,
            transactionData.float_account_id ? "bank" : "cash",
          )
          break

        default:
          console.warn("Unknown transaction type for GL posting:", transactionData.transaction_type)
      }

      console.log("GL entry created:", glEntry)
    } catch (glError) {
      console.error("GL posting failed (non-critical):", glError)
    }

    // 3. Also process using unified service for additional integrations
    const context = {
      userId: transactionData.user_id,
      branchId: transactionData.branch_id,
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    }

    const processingResult = await TransactionService.processJumiaTransaction(
      {
        transactionId: transactionId,
        type: transactionData.transaction_type,
        amount: Number(transactionData.amount || 0),
        trackingId: transactionData.tracking_id,
        customerName: transactionData.customer_name,
        settlementReference: transactionData.settlement_reference,
      },
      context,
    )

    if (!processingResult.success) {
      console.warn("Unified service processing failed but transaction was created:", processingResult.error)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newTransaction,
        gl_entry: glEntry,
        unified_processing: processingResult.success ? "complete" : "partial",
        processing_status: glEntry ? "gl_posted" : "gl_pending",
      },
    })
  } catch (error) {
    console.error("Error creating Jumia transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
