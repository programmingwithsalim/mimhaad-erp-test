import { type NextRequest, NextResponse } from "next/server"
import { getCashInTillAccount } from "@/lib/momo-database-service"

export async function GET(request: NextRequest, { params }: { params: { branchId: string } }) {
  try {
    const branchId = params.branchId
    const cashTillAccount = await getCashInTillAccount(branchId)

    return NextResponse.json({
      success: true,
      balance: cashTillAccount?.current_balance || 0,
      account: cashTillAccount,
    })
  } catch (error) {
    console.error("Error fetching cash till balance:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cash till balance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
