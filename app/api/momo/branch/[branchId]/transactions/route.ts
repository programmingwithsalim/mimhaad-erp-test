import { type NextRequest, NextResponse } from "next/server"
import { getMoMoTransactionsByBranch, createMoMoTransaction } from "@/lib/momo-database-service"

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
  try {
    const branchId = params.branchId
    const { searchParams } = new URL(request.url)

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch ID is required",
          transactions: [],
        },
        { status: 400 },
      )
    }

    const filters = {
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      provider: searchParams.get("provider") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? Number.parseInt(searchParams.get("offset")!) : undefined,
    }

    const transactions = await getMoMoTransactionsByBranch(branchId, filters)

    // Ensure transactions is always an array
    const safeTransactions = Array.isArray(transactions) ? transactions : []

    return NextResponse.json({
      success: true,
      transactions: safeTransactions,
      count: safeTransactions.length,
    })
  } catch (error) {
    console.error("Error fetching MoMo transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch MoMo transactions",
        details: error instanceof Error ? error.message : "Unknown error",
        transactions: [], // Always provide an empty array as fallback
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { branchId: string } }) {
  try {
    const branchId = params.branchId
    const data = await request.json()

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch ID is required",
        },
        { status: 400 },
      )
    }

    // Validate required fields
    const requiredFields = [
      "type",
      "amount",
      "fee",
      "phone_number",
      "customer_name",
      "float_account_id",
      "user_id",
      "processed_by",
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 },
        )
      }
    }

    // Validate amount and fee
    if (isNaN(data.amount) || data.amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number",
        },
        { status: 400 },
      )
    }

    if (isNaN(data.fee) || data.fee < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Fee must be a non-negative number",
        },
        { status: 400 },
      )
    }

    // Create transaction
    const transaction = await createMoMoTransaction({
      ...data,
      branch_id: branchId,
    })

    // Return a more detailed response
    return NextResponse.json({
      success: true,
      transaction,
      message: "Transaction created successfully",
    })
  } catch (error) {
    console.error("Error creating MoMo transaction:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create MoMo transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
