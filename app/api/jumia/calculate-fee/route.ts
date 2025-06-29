import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { amount, transactionType } = await request.json()

    if (!transactionType) {
      return NextResponse.json({ success: false, error: "Transaction type is required" }, { status: 400 })
    }

    let fee = 0
    let feeType = "none"

    // Jumia transactions typically don't have additional fees
    // Commission is earned from Jumia directly
    if (transactionType === "pod_collection") {
      fee = 0 // No additional fee charged to customer
      feeType = "commission_based"
    } else if (transactionType === "package_receipt") {
      fee = 0 // No fee for receiving packages
      feeType = "free"
    }

    return NextResponse.json({
      success: true,
      fee: Number(fee.toFixed(2)),
      feeType,
      feeSource: "calculated",
    })
  } catch (error) {
    console.error("Error calculating Jumia fee:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate fee" }, { status: 500 })
  }
}
