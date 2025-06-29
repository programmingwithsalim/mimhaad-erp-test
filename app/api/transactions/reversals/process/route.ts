import { type NextRequest, NextResponse } from "next/server"
import { TransactionReversalService } from "@/lib/services/transaction-reversal-service-enhanced"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactionId, serviceType, reversalType, reason, requestedBy, branchId } = body

    // Validate required fields
    if (!transactionId || !serviceType || !reversalType || !reason || !requestedBy || !branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    // Validate service type
    if (!["momo", "agency-banking", "e-zwich"].includes(serviceType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid service type",
        },
        { status: 400 },
      )
    }

    // Validate reversal type
    if (!["void", "reverse"].includes(reversalType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reversal type",
        },
        { status: 400 },
      )
    }

    // Process the reversal
    const result = await TransactionReversalService.processReversal({
      transactionId,
      serviceType,
      reversalType,
      reason,
      requestedBy,
      branchId,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        reversalId: result.reversalId,
        message: result.message,
        glEntries: result.glEntries,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          errorCode: result.error,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error processing transaction reversal:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process reversal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
