import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { amount, provider, transactionType } = await request.json()

    if (!amount || !provider) {
      return NextResponse.json({ success: false, error: "Amount and provider are required" }, { status: 400 })
    }

    let fee = 0
    let feeType = "none"

    // Power sales typically don't have additional fees
    // The margin is built into the selling price
    if (transactionType === "sale") {
      fee = 0
      feeType = "included_in_price"
    }

    return NextResponse.json({
      success: true,
      fee: Number(fee.toFixed(2)),
      feeType,
      feeSource: "calculated",
      provider,
    })
  } catch (error) {
    console.error("Error calculating Power fee:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate fee" }, { status: 500 })
  }
}
